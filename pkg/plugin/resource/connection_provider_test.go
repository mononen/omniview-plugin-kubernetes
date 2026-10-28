package resource

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/settings/settingstest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sfake "k8s.io/client-go/kubernetes/fake"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
)

func TestCheckConnection_NilConn(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	status, err := p.CheckConnection(context.Background(), nil, nil)
	assert.NoError(t, err)
	assert.Equal(t, types.ConnectionStatusError, status.Status)
	assert.Contains(t, status.Error, "connection is required")
}

func TestCheckConnection_NilClient(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	conn := &types.Connection{ID: "test"}
	status, err := p.CheckConnection(context.Background(), conn, nil)
	assert.NoError(t, err)
	assert.Equal(t, types.ConnectionStatusError, status.Status)
	assert.Contains(t, status.Error, "client is required")
}

func TestCreateClient_NoSession(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	client, err := p.CreateClient(context.Background())
	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "no session")
}

func TestLoadConnections_NoSession(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	conns, err := p.LoadConnections(context.Background())
	assert.Error(t, err)
	assert.Nil(t, conns)
	assert.Contains(t, err.Error(), "no session")
}

func TestRefreshClient_NilClient(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	err := p.RefreshClient(context.Background(), nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "nil client")
}

func TestDestroyClient_NilClient(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	err := p.DestroyClient(context.Background(), nil)
	assert.NoError(t, err)
}

func TestDestroyClient_NoSources(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	// An unused ClientSet has no native sources to stop.
	cs := &clients.ClientSet{}
	err := p.DestroyClient(context.Background(), cs)
	assert.NoError(t, err)
}

func connectionTestSession(ctx context.Context, paths ...string) context.Context {
	return resourcev2.WithSession(ctx, resourcev2.Session{
		PluginConfig: &settingstest.StubProvider{StringSlices: map[string][]string{"kubeconfigs": paths}},
	})
}

func writeConnectionTestConfig(t *testing.T, path, name string) {
	t.Helper()
	content := "apiVersion: v1\nkind: Config\nclusters:\n- name: local\n  cluster:\n    server: https://127.0.0.1:6443\nusers:\n- name: local\n  user: {}\ncontexts:\n- name: " + name + "\n  context:\n    cluster: local\n    user: local\n"
	require.NoError(t, os.WriteFile(path, []byte(content), 0600))
}

func TestLoadConnectionsUsesV2SessionAndSorts(t *testing.T) {
	dir := t.TempDir()
	first, second := filepath.Join(dir, "first"), filepath.Join(dir, "second")
	writeConnectionTestConfig(t, first, "zeta")
	writeConnectionTestConfig(t, second, "alpha")
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	connections, err := p.LoadConnections(connectionTestSession(context.Background(), first, filepath.Join(dir, "missing"), second))
	require.NoError(t, err)
	require.Len(t, connections, 2)
	require.Equal(t, "alpha", connections[0].Name)
	require.Equal(t, "zeta", connections[1].Name)
}

func TestWatchConnectionsRefreshesAtomicReplacementAndCloses(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config")
	writeConnectionTestConfig(t, path, "before")
	ctx, cancel := context.WithCancel(connectionTestSession(context.Background(), path))
	defer cancel()
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	updates, err := p.WatchConnections(ctx)
	require.NoError(t, err)
	select {
	case initial, open := <-updates:
		require.True(t, open)
		require.Len(t, initial, 1)
		require.Equal(t, "before", initial[0].Name)
	case <-time.After(5 * time.Second):
		t.Fatal("missing initial connection snapshot")
	}
	replacement := filepath.Join(dir, "replacement")
	writeConnectionTestConfig(t, replacement, "after")
	require.NoError(t, os.Rename(replacement, path))
	deadline := time.After(5 * time.Second)
	for {
		select {
		case snapshot, open := <-updates:
			require.True(t, open)
			if len(snapshot) == 1 && snapshot[0].Name == "after" {
				cancel()
				closed := time.After(5 * time.Second)
				for {
					select {
					case _, open := <-updates:
						if !open {
							return
						}
					case <-closed:
						t.Fatal("connection watcher did not close after cancellation")
					}
				}
			}
		case <-deadline:
			t.Fatal("missing snapshot after atomic kubeconfig replacement")
		}
	}
}

func TestConnectionMethodsRejectMissingSession(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	_, err := p.WatchConnections(context.Background())
	require.ErrorContains(t, err, "no session")
	err = p.RefreshClient(context.Background(), &clients.ClientSet{})
	require.ErrorContains(t, err, "no session")
	_, err = p.CreateClient(resourcev2.WithSession(context.Background(), resourcev2.Session{}))
	require.ErrorContains(t, err, "no session")
}

func TestGetNamespacesUsesNativeNames(t *testing.T) {
	p := &kubeConnectionProvider{logger: zap.NewNop().Sugar()}
	client := &clients.ClientSet{KubeClient: k8sfake.NewClientset(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "team-a"}},
	)}
	namespaces, err := p.GetNamespaces(context.Background(), client)
	require.NoError(t, err)
	require.ElementsMatch(t, []string{"default", "team-a"}, namespaces)
	_, err = p.GetNamespaces(context.Background(), nil)
	require.ErrorContains(t, err, "client is required")
}
