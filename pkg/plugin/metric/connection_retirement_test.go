package metric

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/omniview/kubernetes/pkg/utils/kubeauth"
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/httpstream"
	streamspdy "k8s.io/apimachinery/pkg/util/httpstream/spdy"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
)

// retirementAPIServer speaks the native service/endpoints and SPDY port-forward
// protocols. Data streams connect to a real owned Prometheus HTTP endpoint;
// neither client-go nor the forwarding engine is replaced by an echo/mock.
type retirementAPIServer struct {
	server      *httptest.Server
	backend     *httptest.Server
	mu          sync.Mutex
	connections []httpstream.Connection
	upgraded    chan struct{}
	gatePath    string
	entered     chan struct{}
	release     chan struct{}
	gateOnce    sync.Once
}

func newRetirementAPIServer(t *testing.T, value, gatePath string) *retirementAPIServer {
	t.Helper()
	f := &retirementAPIServer{gatePath: gatePath, entered: make(chan struct{}), release: make(chan struct{}), upgraded: make(chan struct{}, 16)}
	f.backend = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/query" || r.URL.Query().Get("query") != "up" {
			http.Error(w, "unexpected Prometheus query", 400)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Connection", "close")
		fmt.Fprintf(w, `{"status":"success","data":{"resultType":"vector","result":[{"metric":{"__name__":"up"},"value":[1,%q]}]}}`, value)
	}))
	f.server = httptest.NewServer(http.HandlerFunc(f.serveHTTP))
	t.Cleanup(func() {
		f.mu.Lock()
		connections := append([]httpstream.Connection(nil), f.connections...)
		f.mu.Unlock()
		for _, connection := range connections {
			connection.Close()
		}
		f.server.Close()
		f.backend.Close()
	})
	return f
}

func (f *retirementAPIServer) serveHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Authorization") != "Bearer owned-retirement-fixture" {
		http.Error(w, "authentication required", 401)
		return
	}
	if f.gatePath != "" && strings.Contains(r.URL.Path, f.gatePath) {
		f.gateOnce.Do(func() { close(f.entered) })
		select {
		case <-f.release:
		case <-r.Context().Done():
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/version":
		io.WriteString(w, `{"major":"1","minor":"35","gitVersion":"v1.35.0"}`)
	case strings.Contains(r.URL.Path, "/proxy/"):
		w.WriteHeader(http.StatusForbidden)
		io.WriteString(w, `{"apiVersion":"v1","kind":"Status","status":"Failure","reason":"Forbidden","code":403}`)
	case strings.HasSuffix(r.URL.Path, "/services/prometheus"):
		io.WriteString(w, `{"apiVersion":"v1","kind":"Service","metadata":{"name":"prometheus","namespace":"monitoring"},"spec":{"ports":[{"port":9090}]}}`)
	case strings.HasSuffix(r.URL.Path, "/endpoints/prometheus"):
		io.WriteString(w, `{"apiVersion":"v1","kind":"Endpoints","metadata":{"name":"prometheus","namespace":"monitoring"},"subsets":[{"addresses":[{"ip":"127.0.0.1","targetRef":{"kind":"Pod","name":"prometheus-0","namespace":"monitoring"}}]}]}`)
	case strings.HasSuffix(r.URL.Path, "/pods/prometheus-0/portforward"):
		f.servePortForward(w, r)
	default:
		http.Error(w, "unexpected Kubernetes endpoint: "+r.URL.Path, 404)
	}
}

func (f *retirementAPIServer) servePortForward(w http.ResponseWriter, r *http.Request) {
	if _, err := httpstream.Handshake(r, w, []string{portforward.PortForwardProtocolV1Name}); err != nil {
		return
	}
	connection := streamspdy.NewResponseUpgrader().UpgradeResponse(w, r, func(stream httpstream.Stream, replySent <-chan struct{}) error {
		go func() {
			<-replySent
			defer stream.Close()
			if stream.Headers().Get(corev1.StreamType) == corev1.StreamTypeError {
				return
			}
			if stream.Headers().Get(corev1.StreamType) != corev1.StreamTypeData || stream.Headers().Get(corev1.PortHeader) != "9090" {
				stream.Reset()
				return
			}
			remote, err := net.DialTimeout("tcp", f.backend.Listener.Addr().String(), 3*time.Second)
			if err != nil {
				stream.Reset()
				return
			}
			defer remote.Close()
			copied := make(chan struct{})
			go func() { io.Copy(remote, stream); close(copied) }()
			io.Copy(stream, remote)
			stream.Close()
			remote.Close()
			<-copied
		}()
		return nil
	})
	if connection == nil {
		return
	}
	f.mu.Lock()
	f.connections = append(f.connections, connection)
	f.mu.Unlock()
	f.upgraded <- struct{}{}
	<-connection.CloseChan()
}

func retirementBundle(ctx context.Context, conn *types.Connection) (*kubeauth.KubeClientBundle, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	config := &rest.Config{Host: conn.Data["endpoint"].(string), BearerToken: "owned-retirement-fixture"}
	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	return &kubeauth.KubeClientBundle{Clientset: client, RestConfig: config}, nil
}

func retirementConnection(id string, server *retirementAPIServer) *types.Connection {
	return &types.Connection{ID: id, Data: map[string]interface{}{"endpoint": server.server.URL}}
}

func retirementClient(t *testing.T, factory ClientFactory) *prometheusClient {
	t.Helper()
	c := &prometheusClient{clientCache: NewClientCache(ClientCacheOpts{Factory: factory}), detector: NewPrometheusDetector(DetectorOpts{}), pfManager: NewPortForwardManager(PortForwardOpts{}), proxyFailed: make(map[string]bool)}
	t.Cleanup(func() { c.clientCache.Stop(); c.pfManager.CloseAll() })
	return c
}

func retirementContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	t.Cleanup(cancel)
	return ctx
}

func retirementAwait(t *testing.T, ctx context.Context, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-ctx.Done():
		t.Fatalf("retirement barrier: %v", ctx.Err())
	}
}

func retirementParams() map[string]string {
	return map[string]string{"prometheus_service_name": "prometheus", "prometheus_service_namespace": "monitoring", "prometheus_service_port": "9090"}
}

func retirementQuery(t *testing.T, ctx context.Context, c *prometheusClient, conn *types.Connection, want string) {
	t.Helper()
	result, err := c.query(ctx, conn.ID, conn, "up", retirementParams())
	require.NoError(t, err)
	require.Len(t, result.Data.Result, 1)
	require.Equal(t, want, result.Data.Result[0].Value[1])
}

// This is the production authority seam: the SDK owns the sole connection
// generation and cancels every utility lease before invoking native OnStop.
func retirementController(t *testing.T, ctx context.Context, c *prometheusClient, profiles ...*types.Connection) *resourcev2.Controller[kubeauth.KubeClientBundle] {
	t.Helper()
	controller, err := resourcev2.NewController(resourcev2.Config[kubeauth.KubeClientBundle]{
		Catalog: func(context.Context, resourcev2.CatalogRequest) (resourcev2.Catalog, error) {
			return resourcev2.Catalog{}, nil
		},
		Lifecycle: &resourcev2.Lifecycle[kubeauth.KubeClientBundle]{
			LoadConnections: func(context.Context) ([]types.Connection, error) {
				out := make([]types.Connection, len(profiles))
				for i, profile := range profiles {
					out[i] = *profile
				}
				return out, nil
			},
			CreateClient: func(ctx context.Context, conn types.Connection) (*kubeauth.KubeClientBundle, error) {
				return retirementBundle(ctx, &conn)
			},
			DestroyClient: func(context.Context, *kubeauth.KubeClientBundle) error { return nil },
			CheckConnection: func(ctx context.Context, conn types.Connection, client *kubeauth.KubeClientBundle) (types.ConnectionStatus, error) {
				_, err := client.Clientset.CoreV1().RESTClient().Get().AbsPath("/version").DoRaw(ctx)
				return types.ConnectionStatus{Connection: &conn, Status: types.ConnectionStatusConnected}, err
			},
			OnStop: func(_ context.Context, conn types.Connection, _ *kubeauth.KubeClientBundle) error {
				c.retireConnection(conn.ID)
				return nil
			},
		},
	})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, controller.Close()) })
	_, err = controller.LoadConnections(ctx)
	require.NoError(t, err)
	for _, profile := range profiles {
		_, err = controller.StartConnection(ctx, profile.ID)
		require.NoError(t, err)
		_, err = controller.CheckConnection(ctx, profile.ID)
		require.NoError(t, err)
	}
	return controller
}

func retirementLeasedQuery(t *testing.T, ctx context.Context, controller *resourcev2.Controller[kubeauth.KubeClientBundle], c *prometheusClient, id, want string) {
	t.Helper()
	var result *promAPIResponse
	err := controller.WithConnection(ctx, resourcev2.AccessRoute{Connection: id}, func(native context.Context, profile types.Connection) error {
		var err error
		result, err = c.query(native, id, &profile, "up", retirementParams())
		return err
	})
	require.NoError(t, err)
	require.Len(t, result.Data.Result, 1)
	require.Equal(t, want, result.Data.Result[0].Value[1])
}

func TestMetricConnectionRetirementReplacesRealTunnelAndEndpoint(t *testing.T) {
	ctx := retirementContext(t)
	a := newRetirementAPIServer(t, "1", "")
	b := newRetirementAPIServer(t, "2", "")
	c := retirementClient(t, retirementBundle)
	primary := retirementConnection("primary", a)
	secondary := retirementConnection("secondary", a)
	controller := retirementController(t, ctx, c, primary, secondary)
	retirementLeasedQuery(t, ctx, controller, c, primary.ID, "1")
	select {
	case <-a.upgraded:
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	retirementLeasedQuery(t, ctx, controller, c, secondary.ID, "1")
	select {
	case <-a.upgraded:
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	require.Equal(t, 2, c.clientCache.Len())
	require.Equal(t, 2, c.detector.CacheLen())
	c.pfManager.mu.Lock()
	old, unrelated := c.pfManager.sessions[primary.ID], c.pfManager.sessions[secondary.ID]
	oldURL := old.url
	c.pfManager.mu.Unlock()
	retired := make(chan struct{})
	var stopErr error
	go func() { _, stopErr = controller.StopConnection(ctx, primary.ID); close(retired) }()
	retirementAwait(t, ctx, retired)
	require.NoError(t, stopErr)
	retirementAwait(t, ctx, old.done)
	a.mu.Lock()
	serverConnections := append([]httpstream.Connection(nil), a.connections...)
	a.mu.Unlock()
	require.Len(t, serverConnections, 2)
	select {
	case <-serverConnections[0].CloseChan():
	case <-ctx.Done():
		t.Fatal("retired native SPDY connection did not close", ctx.Err())
	}
	select {
	case <-serverConnections[1].CloseChan():
		t.Fatal("unrelated SPDY connection closed")
	default:
	}
	require.Equal(t, 1, c.clientCache.Len())
	require.Equal(t, 1, c.detector.CacheLen())
	require.Equal(t, 1, c.pfManager.Len())
	c.proxyFailedMu.RLock()
	primaryFailed, secondaryFailed := c.proxyFailed[primary.ID], c.proxyFailed[secondary.ID]
	c.proxyFailedMu.RUnlock()
	require.False(t, primaryFailed, "retired proxy-failure state survived")
	require.True(t, secondaryFailed, "unrelated fallback state was retired")
	request, err := http.NewRequestWithContext(ctx, "GET", oldURL+"/api/v1/query?query=up", nil)
	require.NoError(t, err)
	transport := &http.Transport{DisableKeepAlives: true}
	defer transport.CloseIdleConnections()
	response, err := (&http.Client{Transport: transport}).Do(request)
	if response != nil {
		response.Body.Close()
	}
	require.Error(t, err, "old local tunnel still accepts queries")
	retirementLeasedQuery(t, ctx, controller, c, secondary.ID, "1")
	c.pfManager.mu.Lock()
	currentUnrelated := c.pfManager.sessions[secondary.ID]
	c.pfManager.mu.Unlock()
	require.Same(t, unrelated, currentUnrelated)
	_, err = controller.UpdateConnection(ctx, *retirementConnection(primary.ID, b))
	require.NoError(t, err)
	_, err = controller.StartConnection(ctx, primary.ID)
	require.NoError(t, err)
	retirementLeasedQuery(t, ctx, controller, c, primary.ID, "2")
	c.pfManager.mu.Lock()
	newSession := c.pfManager.sessions[primary.ID]
	c.pfManager.mu.Unlock()
	require.NotSame(t, old, newSession)
}

func TestMetricPendingClientCannotPublishAfterRetirement(t *testing.T) {
	ctx := retirementContext(t)
	a, b := newRetirementAPIServer(t, "1", ""), newRetirementAPIServer(t, "2", "")
	entered, release, finished := make(chan struct{}), make(chan struct{}), make(chan struct{})
	var once sync.Once
	sourceCtx := ctx
	c := retirementClient(t, func(ctx context.Context, conn *types.Connection) (*kubeauth.KubeClientBundle, error) {
		if conn.Data["endpoint"] == a.server.URL {
			once.Do(func() { close(entered) })
			// Ignore the retired build context, but keep a bounded test lifetime.
			select {
			case <-release:
			case <-sourceCtx.Done():
				return nil, sourceCtx.Err()
			}
			return retirementBundle(context.Background(), conn)
		}
		return retirementBundle(ctx, conn)
	})
	var oldErr error
	go func() {
		_, oldErr = c.clientCache.Get(ctx, "primary", retirementConnection("primary", a))
		close(finished)
	}()
	retirementAwait(t, ctx, entered)
	c.retireConnection("primary")
	fresh, err := c.clientCache.Get(ctx, "primary", retirementConnection("primary", b))
	require.NoError(t, err)
	close(release)
	retirementAwait(t, ctx, finished)
	require.Error(t, oldErr)
	current, err := c.clientCache.Get(ctx, "primary", retirementConnection("primary", b))
	require.NoError(t, err)
	require.Same(t, fresh, current)
	retirementQuery(t, ctx, c, retirementConnection("primary", b), "2")
}

func TestMetricPendingDetectionAndProxyCannotReviveRetiredQuery(t *testing.T) {
	for _, stage := range []string{"/services/prometheus", "/proxy/"} {
		t.Run(stage, func(t *testing.T) {
			ctx := retirementContext(t)
			a := newRetirementAPIServer(t, "1", stage)
			b := newRetirementAPIServer(t, "2", "")
			c := retirementClient(t, retirementBundle)
			finished := make(chan struct{})
			var oldErr error
			controller := retirementController(t, ctx, c, retirementConnection("primary", a))
			go func() {
				oldErr = controller.WithConnection(ctx, resourcev2.AccessRoute{Connection: "primary"}, func(native context.Context, profile types.Connection) error {
					_, err := c.query(native, profile.ID, &profile, "up", retirementParams())
					return err
				})
				close(finished)
			}()
			retirementAwait(t, ctx, a.entered)
			_, err := controller.StopConnection(ctx, "primary")
			require.NoError(t, err)
			close(a.release)
			retirementAwait(t, ctx, finished)
			require.Error(t, oldErr, "an in-flight old query survived retirement")
			require.Zero(t, c.clientCache.Len(), "old query republished clients")
			require.Zero(t, c.detector.CacheLen(), "old query republished detection")
			require.Zero(t, c.pfManager.Len(), "old query opened a replacement tunnel")
			c.proxyFailedMu.RLock()
			failed := c.proxyFailed["primary"]
			c.proxyFailedMu.RUnlock()
			require.False(t, failed, "old query republished proxy failure")
			_, err = controller.UpdateConnection(ctx, *retirementConnection("primary", b))
			require.NoError(t, err)
			_, err = controller.StartConnection(ctx, "primary")
			require.NoError(t, err)
			retirementLeasedQuery(t, ctx, controller, c, "primary", "2")
		})
	}
}

func TestMetricPendingPortForwardCannotPublishAfterRetirement(t *testing.T) {
	ctx := retirementContext(t)
	a := newRetirementAPIServer(t, "1", "/endpoints/prometheus")
	b := newRetirementAPIServer(t, "2", "")
	c := retirementClient(t, retirementBundle)
	clients, err := retirementBundle(ctx, retirementConnection("primary", a))
	require.NoError(t, err)
	finished := make(chan struct{})
	var oldErr error
	go func() {
		_, oldErr = c.pfManager.GetOrCreate(ctx, "primary", clients.RestConfig, clients.Clientset, "monitoring", "prometheus", 9090)
		close(finished)
	}()
	retirementAwait(t, ctx, a.entered)
	retired := make(chan struct{})
	go func() { c.retireConnection("primary"); close(retired) }()
	retirementAwait(t, ctx, retired)
	close(a.release)
	retirementAwait(t, ctx, finished)
	require.Error(t, oldErr)
	require.Zero(t, c.pfManager.Len())
	retirementQuery(t, ctx, c, retirementConnection("primary", b), "2")
}
