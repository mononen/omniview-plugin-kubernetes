package resource

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"

	"github.com/omniview/kubernetes/pkg/plugin/helm"
	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/omniview/kubernetes/pkg/plugin/resource/resourcers"
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
	"go.uber.org/zap"
)

const nativeRepresentationVersion = "kubernetes.object.v1"

type nativeCatalogSnapshot struct {
	catalog resourcev2.Catalog
	bindings map[string]nativeType
	registrations map[string]resourcev2.Registration[clients.ClientSet]
	documents map[resourcev2.SchemaDocumentReference]resourcev2.SchemaDocument
	identityHint *resourcev2.NativeAuthorityHint
}

type kubernetesProvider struct {
	*resourcev2.Controller[clients.ClientSet]
	connections *kubeConnectionProvider
	mu sync.RWMutex
	catalogs map[string]*nativeCatalogSnapshot
	helpers map[string]any
	relationships map[string][]resourcev2.RelationshipDescriptor
	helmTypes []resourcev2.ResourceType
	helmDefinitions map[string]resourcev2.ResourceDefinition
	helmAncillary *helm.HelmAncillary
	logger *zap.SugaredLogger
}

func newKubernetesProvider(logger *zap.SugaredLogger) (*kubernetesProvider, error) {
	service := helm.NewHelmService()
	relationships := resourcers.RelationshipTable()
	provider := &kubernetesProvider{
		connections: &kubeConnectionProvider{logger: logger},
		catalogs: make(map[string]*nativeCatalogSnapshot),
		helpers: nativeSpecializedHelpers(logger, relationships),
		relationships: relationships,
		helmTypes: helm.HelmResourceTypes(),
		helmDefinitions: helm.HelmResourceDefinitions(),
		helmAncillary: helm.NewHelmAncillary(logger, service),
		logger: logger,
	}
	controller, err := resourcev2.NewController(resourcev2.Config[clients.ClientSet]{
		DynamicUpdates: true,
		Catalog: provider.catalog,
		Registrations: append(helm.HelmRegistrations(logger, service), auditRegistration()),
		ResolveRegistration: provider.registration,
		ErrorClassifier: &kubeErrorClassifier{},
		Lifecycle: &resourcev2.Lifecycle[clients.ClientSet]{
			LoadConnections: provider.connections.LoadConnections,
			CreateClient: func(ctx context.Context, _ types.Connection) (*clients.ClientSet, error) { return provider.connections.CreateClient(ctx) },
			DestroyClient: provider.connections.DestroyClient,
			CheckConnection: provider.checkConnection,
			OnStart: provider.startNativeConnection,
			OnStop: func(_ context.Context, connection types.Connection, _ *clients.ClientSet) error {
				provider.mu.Lock()
				delete(provider.catalogs, connection.ID)
				provider.mu.Unlock()
				return nil
			},
		},
	})
	if err != nil { return nil, err }
	provider.Controller = controller
	return provider, nil
}

func nativeSpecializedHelpers(logger *zap.SugaredLogger, relationships map[string][]resourcev2.RelationshipDescriptor) map[string]any {
	opts := func(token string) []resourcers.Option { return []resourcers.Option{resourcers.WithRelationships(relationships[token])} }
	return map[string]any{
		"k8s:/nodes": resourcers.NewNodeResourcer(logger, opts("k8s:/nodes")...),
		"k8s:/pods": resourcers.NewPodResourcer(logger, opts("k8s:/pods")...),
		"k8s:apps/deployments": resourcers.NewDeploymentResourcer(logger, opts("k8s:apps/deployments")...),
		"k8s:apps/daemonsets": resourcers.NewDaemonSetResourcer(logger, opts("k8s:apps/daemonsets")...),
		"k8s:apps/statefulsets": resourcers.NewStatefulSetResourcer(logger, opts("k8s:apps/statefulsets")...),
		"k8s:autoscaling/horizontalpodautoscalers": resourcers.NewHPAResourcer(logger, opts("k8s:autoscaling/horizontalpodautoscalers")...),
		"k8s:rbac.authorization.k8s.io/rolebindings": resourcers.NewRoleBindingResourcer(logger, opts("k8s:rbac.authorization.k8s.io/rolebindings")...),
	}
}

func (p *kubernetesProvider) startNativeConnection(ctx context.Context, connection types.Connection, client *clients.ClientSet) error {
	bindings, coverage, err := discoverNativeTypes(ctx, client.DiscoveryClient)
	if err != nil { return err }
	schemas, failures := fetchNativeSchemas(ctx, client.DiscoveryClient.RESTClient(), bindings)
	if err := ctx.Err(); err != nil { return err }
	identity, err := nativeClusterIdentity(ctx, client.KubeClient)
	if err != nil { return err }
	var identityHint *resourcev2.NativeAuthorityHint
	if identity != nil {
		identityHint = &resourcev2.NativeAuthorityHint{Scheme: "kubernetes.namespace-uid.v1", ID: *identity, Continuity: resourcev2.ContinuityConnectionLocal}
	}
	watchScope, err := p.connections.ResolveScope(ctx, client)
	if err != nil { return err }
	registrations := make(map[string]resourcev2.Registration[clients.ClientSet], len(bindings))
	documents := make(map[resourcev2.SchemaDocumentReference]resourcev2.SchemaDocument)
	for token, binding := range bindings {
		representation := resourcev2.Representation{
			ID: nativeRepresentationVersion + "/" + binding.GVR.GroupVersion().String(),
			Revision: nativeRepresentationVersion + "/" + binding.GVR.GroupVersion().String(),
			Schema: resourcev2.SchemaBinding{State: "unavailable", Validation: "none", Unvalidated: []string{}},
		}
		if document, ok := schemas[token]; ok {
			ref := resourcev2.SchemaDocumentReference{ID: "kubernetes.openapi.v3/" + binding.GVR.GroupVersion().String(), Revision: document.Revision}
			revision := document.Revision
			representation.Schema = resourcev2.SchemaBinding{
				State: "available", Revision: &revision, Dialect: "openapi-3.0", Root: document.Root,
				DocumentRef: &ref, Validation: "none", Unvalidated: []string{},
			}
			documents[ref] = resourcev2.SchemaDocument{Reference: ref, Dialect: "openapi-3.0", Document: document.Document}
		} else if failures[token] != nil {
			p.logger.Debugw("native schema unavailable", "type", token)
		}
		binding.Descriptor.Representations = []resourcev2.Representation{representation}
		if actions, ok := p.helpers[token].(nativeActionHelper); ok {
			descriptors, err := actions.GetActions(ctx, client)
			if err != nil { return err }
			if len(descriptors) != 0 {
				binding.Descriptor.Capabilities = append(binding.Descriptor.Capabilities, resourcev2.Capability{Operation: resourcev2.OperationAction, Scope: nativeTypeScope(binding)})
			}
		}
		binding.Descriptor.DefaultRepresentation = representation.ID
		binding.Descriptor.NativeAuthorityHint = identityHint
		if verbSliceContains(binding.API.Verbs, "list") && verbSliceContains(binding.API.Verbs, "watch") {
			scope := nativeTypeScope(binding)
			if binding.API.Namespaced { scope = watchScope }
			binding.Descriptor.Capabilities = append(binding.Descriptor.Capabilities, resourcev2.Capability{Operation: resourcev2.OperationUpdate, Scope: scope, Guarantee: resourcev2.BestEffortGuarantee})
		}
		bindings[token] = binding
		registrations[token] = p.nativeRegistration(resourcev2.AccessRoute{Connection: connection.ID}, binding)
	}
	catalog := resourcev2.Catalog{Provider: "kubernetes", Types: sortedNativeTypes(bindings), Coverage: coverage}
	catalog.Types = append(catalog.Types, p.helmTypes...)
	catalog.Types = append(catalog.Types, auditResourceType())
	for index := range catalog.Types {
		if catalog.Types[index].Type == "helm:releases" { catalog.Types[index].NativeAuthorityHint = identityHint }
	}
	encoded, err := json.Marshal(catalog)
	if err != nil { return err }
	digest := sha256.Sum256(encoded)
	catalog.Revision = hex.EncodeToString(digest[:])
	if err := resourcev2.ValidateCatalog(catalog); err != nil { return err }
	p.mu.Lock()
	p.catalogs[connection.ID] = &nativeCatalogSnapshot{catalog: catalog, bindings: bindings, registrations: registrations, documents: documents, identityHint: identityHint}
	p.mu.Unlock()
	return nil
}

func nativeTypeScope(binding nativeType) resourcev2.QueryScope {
	if binding.API.Namespaced { return resourcev2.QueryScope{{Dimension: "namespace", Match: resourcev2.ScopeAny}} }
	return resourcev2.QueryScope{}
}

func (p *kubernetesProvider) snapshot(route resourcev2.AccessRoute) (*nativeCatalogSnapshot, error) {
	if route.Connection == "" { return nil, resourcev2.NewError("INVALID_REQUEST", "An explicit connection is required") }
	p.mu.RLock()
	snapshot := p.catalogs[route.Connection]
	p.mu.RUnlock()
	if snapshot == nil { return nil, resourcev2.NewError("UNAVAILABLE", "Connection catalog is not available") }
	return snapshot, nil
}

func (p *kubernetesProvider) catalog(ctx context.Context, request resourcev2.CatalogRequest) (catalog resourcev2.Catalog, err error) {
	err = p.WithClient(ctx, request.Route, func(_ context.Context, _ *clients.ClientSet) error {
		snapshot, err := p.snapshot(request.Route)
		if err != nil { return err }
		catalog = snapshot.catalog
		return nil
	})
	return catalog, err
}

func (p *kubernetesProvider) registration(_ context.Context, route resourcev2.AccessRoute, token string) (resourcev2.Registration[clients.ClientSet], error) {
	registration := resourcev2.Registration[clients.ClientSet]{Type: token, Connection: route.Connection}
	// Static Helm registrations use their own native operations.
	for _, descriptor := range p.helmTypes { if descriptor.Type == token { return registration, nil } }
	if token == auditType { return registration, nil }
	snapshot, err := p.snapshot(route)
	if err != nil { return registration, err }
	registration, ok := snapshot.registrations[token]
	if !ok { return registration, resourcev2.NewError("NOT_FOUND", "Resource type is not present in this connection catalog") }
	return registration, nil
}

func (p *kubernetesProvider) nativeRegistration(route resourcev2.AccessRoute, binding nativeType) resourcev2.Registration[clients.ClientSet] {
	token := binding.Descriptor.Type
	registration := resourcev2.Registration[clients.ClientSet]{Type: token, Connection: route.Connection}
	representation := binding.Descriptor.Representations[0]
	if verbSliceContains(binding.API.Verbs, "get") {
		registration.Get = func(ctx context.Context, client *clients.ClientSet, request resourcev2.GetRequest) (resourcev2.Record, error) {
			return NativeGet(ctx, client.DynamicClient, binding.GVR, binding.API.Namespaced, request, representation)
		}
	}
	if verbSliceContains(binding.API.Verbs, "list") {
		registration.Enumerate = func(ctx context.Context, client *clients.ClientSet, request resourcev2.EnumerateRequest) (resourcev2.SourcePage, error) {
			return NativeEnumerate(ctx, client.DynamicClient, binding.GVR, binding.API.Namespaced, request, representation)
		}
	}
	if verbSliceContains(binding.API.Verbs, "create") || verbSliceContains(binding.API.Verbs, "update") || verbSliceContains(binding.API.Verbs, "delete") {
		registration.Mutate = func(ctx context.Context, client *clients.ClientSet, request resourcev2.MutationRequest) (resourcev2.Record, error) {
			return NativeMutate(ctx, client.DynamicClient, binding.GVR, binding.API.Namespaced, binding.API.Verbs, request, representation)
		}
	}
	if helper, ok := p.helpers[token].(nativeActionHelper); ok {
		registration.Action = func(ctx context.Context, client *clients.ClientSet, request resourcev2.ActionRequest) (resourcev2.Value, error) {
			if _, err := NativeGet(ctx, client.DynamicClient, binding.GVR, binding.API.Namespaced, resourcev2.GetRequest{Route: request.Route, Reference: request.Reference, Representation: representation.ID}, representation); err != nil { return resourcev2.Value{}, err }
			return helper.ExecuteAction(ctx, client, request)
		}
	}
	if verbSliceContains(binding.API.Verbs, "list") && verbSliceContains(binding.API.Verbs, "watch") {
		watcher := resourcers.NewKubernetesResourcerBase[resourcers.MetaAccessor](p.logger, binding.GVR)
		registration.Watch = watcher.Watch
		registration.SyncPolicy = resourcev2.SyncOnConnect
		if token == "k8s:/events" || token == "k8s:events.k8s.io/events" { registration.SyncPolicy = resourcev2.SyncOnFirstQuery }
	}
	return registration
}

func (p *kubernetesProvider) checkConnection(ctx context.Context, connection types.Connection, client *clients.ClientSet) (types.ConnectionStatus, error) {
	status, err := p.connections.CheckConnection(ctx, &connection, client)
	if err != nil || status.Status != types.ConnectionStatusConnected { return status, err }
	identity, err := nativeClusterIdentity(ctx, client.KubeClient)
	if err != nil { return status, err }
	snapshot, err := p.snapshot(resourcev2.AccessRoute{Connection: connection.ID})
	if err != nil { return status, err }
	if hint := snapshot.identityHint; hint != nil && (identity == nil || hint.ID != *identity) {
		return status, resourcev2.NewError("RESET_REQUIRED", "Native Kubernetes backing identity changed; reconnect before acquiring resources")
	}
	return status, nil
}

type nativeActionHelper interface {
	GetActions(context.Context, *clients.ClientSet) ([]resourcev2.ActionDescriptor, error)
	ExecuteAction(context.Context, *clients.ClientSet, resourcev2.ActionRequest) (resourcev2.Value, error)
}
