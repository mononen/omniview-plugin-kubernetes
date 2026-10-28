package resource

import (
	"context"
	"net/url"
	"sort"

	"github.com/omniview/kubernetes/pkg/plugin/helm"
	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/omniview/kubernetes/pkg/plugin/resource/resourcers"
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
)

func (p *kubernetesProvider) ScopeValues(ctx context.Context, route resourcev2.AccessRoute, dimension string) (values []string, err error) {
	if dimension != "namespace" { return nil, resourcev2.NewError("UNSUPPORTED", "Kubernetes does not declare this scope dimension") }
	err = p.WithClient(ctx, route, func(ctx context.Context, client *clients.ClientSet) error {
		values, err = p.connections.GetNamespaces(ctx, client)
		return err
	})
	return values, err
}

func (p *kubernetesProvider) WatchConnections(ctx context.Context, stream chan<- []types.Connection) error {
	updates, err := p.connections.WatchConnections(ctx)
	if err != nil { return err }
	for {
		select {
		case <-ctx.Done(): return ctx.Err()
		case connections, ok := <-updates:
			if !ok { return ctx.Err() }
			if err := p.ApplyConnections(ctx, connections); err != nil { return err }
			current, err := p.ListConnections(ctx)
			if err != nil { return err }
			select { case stream <- current: case <-ctx.Done(): return ctx.Err() }
		}
	}
}

func (p *kubernetesProvider) GetSchemaDocument(ctx context.Context, route resourcev2.AccessRoute, reference resourcev2.SchemaDocumentReference) (document resourcev2.SchemaDocument, err error) {
	err = p.WithClient(ctx, route, func(_ context.Context, _ *clients.ClientSet) error {
		snapshot, err := p.snapshot(route)
		if err != nil { return err }
		var ok bool
		document, ok = snapshot.documents[reference]
		if !ok { return resourcev2.NewError("RESET_REQUIRED", "Schema document revision is not available in this connection catalog") }
		return nil
	})
	return document, err
}

func (p *kubernetesProvider) GetEditorSchemas(ctx context.Context, route resourcev2.AccessRoute) (schemas []resourcev2.EditorSchema, err error) {
	err = p.WithClient(ctx, route, func(_ context.Context, _ *clients.ClientSet) error {
		snapshot, err := p.snapshot(route)
		if err != nil { return err }
		schemas = make([]resourcev2.EditorSchema, 0, len(snapshot.catalog.Types))
		for _, descriptor := range snapshot.catalog.Types {
			for _, representation := range descriptor.Representations {
				if representation.ID != descriptor.DefaultRepresentation { continue }
				encodedType := url.QueryEscape(descriptor.Type)
				uri := "kubernetes.schema/" + url.QueryEscape(route.Connection) + "/" + encodedType
				if representation.Schema.Revision != nil { uri += "/" + url.QueryEscape(*representation.Schema.Revision) }
				schemas = append(schemas, resourcev2.EditorSchema{
					Type: descriptor.Type, FileMatch: "**/" + encodedType + "/*.yaml",
					URI: uri, Language: "yaml", Binding: representation.Schema,
				})
			}
		}
		return nil
	})
	return schemas, err
}

func (p *kubernetesProvider) GetResourceDefinition(ctx context.Context, route resourcev2.AccessRoute, token string) (definition resourcev2.ResourceDefinition, err error) {
	err = p.WithClient(ctx, route, func(_ context.Context, _ *clients.ClientSet) error {
		snapshot, err := p.snapshot(route)
		if err != nil { return err }
		if helmDefinition, ok := p.helmDefinitions[token]; ok { definition = helmDefinition; return nil }
		if token == auditType { definition = resourcers.DefaultResourceDef; return nil }
		if _, ok := snapshot.bindings[token]; !ok { return resourcev2.NewError("NOT_FOUND", "Resource type is not present in this connection catalog") }
		definition, _ = resourcers.ResourceDefs[token]
		if len(definition.ColumnDefs) == 0 { definition = resourcers.DefaultResourceDef }
		return nil
	})
	return definition, err
}

func nativeGroupDisplayID(group string) string {
	switch group {
	case "": return "core"
	case "apps", "batch", "policy": return group
	case "admissionregistration.k8s.io": return "admissionregistration"
	case "apiextensions.k8s.io": return "apiextensions"
	case "apiregistration.k8s.io": return "apiregistration"
	case "autoscaling": return "autoscaling"
	case "authentication.k8s.io": return "authentication"
	case "authorization.k8s.io": return "authorization"
	case "certificates.k8s.io": return "certificates"
	case "coordination.k8s.io": return "coordination"
	case "discovery.k8s.io": return "discovery"
	case "events.k8s.io": return "events"
	case "flowcontrol.apiserver.k8s.io": return "flowcontrol"
	case "internal.apiserver.k8s.io": return "apiserverinternal"
	case "metrics.k8s.io": return "metrics"
	case "networking.k8s.io": return "networking"
	case "node.k8s.io": return "node"
	case "rbac.authorization.k8s.io": return "rbac"
	case "resource.k8s.io": return "resource"
	case "scheduling.k8s.io": return "scheduling"
	case "storage.k8s.io": return "storage"
	default: return ""
	}
}

func (p *kubernetesProvider) GetResourceGroups(ctx context.Context, route resourcev2.AccessRoute) (groups []resourcev2.ResourceGroup, err error) {
	err = p.WithClient(ctx, route, func(_ context.Context, _ *clients.ClientSet) error {
		snapshot, err := p.snapshot(route)
		if err != nil { return err }
		presentations := make(map[string]resourcev2.ResourceGroup, len(ResourceGroups))
		for _, group := range ResourceGroups { presentations[group.ID] = group }
		byID := make(map[string]resourcev2.ResourceGroup)
		for token, binding := range snapshot.bindings {
			id := "k8s:" + binding.GVR.Group
			group, exists := byID[id]
			if !exists {
				group = presentations[nativeGroupDisplayID(binding.GVR.Group)]
				group.ID = id
				if group.Name == "" { group.Name = binding.GVR.Group }
				group.Resources = []string{}
			}
			group.Resources = append(group.Resources, token)
			byID[id] = group
		}
		helmGroup := helm.HelmResourceGroup()
		helmGroup.ID = "helm:"
		byID[helmGroup.ID] = helmGroup
		byID["audit:"] = resourcev2.ResourceGroup{ID: "audit:", Name: "Audits", Resources: []string{auditType}}
		for _, group := range byID { if len(group.Resources) != 0 { sort.Strings(group.Resources); groups = append(groups, group) } }
		sort.Slice(groups, func(i, j int) bool { return groups[i].ID < groups[j].ID })
		return nil
	})
	return groups, err
}

func (p *kubernetesProvider) GetActions(ctx context.Context, route resourcev2.AccessRoute, token string) (actions []resourcev2.ActionDescriptor, err error) {
	err = p.WithClient(ctx, route, func(ctx context.Context, client *clients.ClientSet) error {
		snapshot, snapshotErr := p.snapshot(route)
		if snapshotErr != nil { return snapshotErr }
		found := false
		for _, descriptor := range snapshot.catalog.Types { if descriptor.Type == token { found = true; break } }
		if !found { return resourcev2.NewError("NOT_FOUND", "Resource type is not present in this connection catalog") }
		if helper, ok := p.helpers[token].(nativeActionHelper); ok { actions, err = helper.GetActions(ctx, client); return err }
		for _, descriptor := range p.helmTypes { if descriptor.Type == token { actions, err = p.helmAncillary.GetActions(ctx, client, token); return err } }
		return resourcev2.NewError("UNSUPPORTED", "Resource type does not provide actions")
	})
	return actions, err
}

func (p *kubernetesProvider) StreamAction(ctx context.Context, request resourcev2.ActionRequest, stream chan<- resourcev2.ActionEvent) error {
	if _, err := resourcev2.AdmitStreamingAction(ctx, p, request); err != nil { return err }
	helper, ok := p.helpers[request.Reference.Address.Type].(nativeStreamingActionHelper)
	if !ok { return resourcev2.NewError("UNSUPPORTED", "Resource type does not provide streaming actions") }
	snapshot, err := p.snapshot(request.Route)
	if err != nil { return err }
	binding, ok := snapshot.bindings[request.Reference.Address.Type]
	if !ok { return resourcev2.NewError("NOT_FOUND", "Resource type is not present in this connection catalog") }
	return p.WithClient(ctx, request.Route, func(ctx context.Context, client *clients.ClientSet) error {
		if _, err := NativeGet(ctx, client.DynamicClient, binding.GVR, binding.API.Namespaced, resourcev2.GetRequest{Route: request.Route, Reference: request.Reference, Representation: binding.Descriptor.DefaultRepresentation}, binding.Descriptor.Representations[0]); err != nil { return err }
		return helper.StreamAction(ctx, client, request, stream)
	})
}

func (p *kubernetesProvider) GetRelationships(ctx context.Context, route resourcev2.AccessRoute, token string) (relationships []resourcev2.RelationshipDescriptor, err error) {
	err = p.WithClient(ctx, route, func(_ context.Context, _ *clients.ClientSet) error {
		snapshot, err := p.snapshot(route)
		if err != nil { return err }
		if _, exists := snapshot.bindings[token]; !exists { return resourcev2.NewError("NOT_FOUND", "Resource type is not present in this connection catalog") }
		if helper, ok := p.helpers[token].(nativeRelationshipDeclarer); ok { relationships = helper.DeclareRelationships() } else { relationships = p.relationships[token] }
		if relationships == nil { relationships = []resourcev2.RelationshipDescriptor{} }
		return nil
	})
	return relationships, err
}

func (p *kubernetesProvider) ResolveRelationships(ctx context.Context, request resourcev2.GetRequest) (relationships []resourcev2.ResolvedRelationship, err error) {
	if _, err := p.Get(ctx, request); err != nil { return nil, err }
	helper, ok := p.helpers[request.Reference.Address.Type].(nativeRelationshipResolver)
	if !ok { return nil, resourcev2.NewError("UNSUPPORTED", "Resource type does not resolve native relationships") }
	err = p.WithClient(ctx, request.Route, func(ctx context.Context, client *clients.ClientSet) error { relationships, err = helper.ResolveRelationships(ctx, client, request); return err })
	return relationships, err
}

func (p *kubernetesProvider) GetHealth(ctx context.Context, request resourcev2.GetRequest, body resourcev2.Value) (health *resourcev2.ResourceHealth, err error) {
	if _, err := p.Get(ctx, request); err != nil { return nil, err }
	helper, ok := p.helpers[request.Reference.Address.Type].(nativeHealthAssessor)
	if !ok { return nil, resourcev2.NewError("UNSUPPORTED", "Resource type does not assess native health") }
	err = p.WithClient(ctx, request.Route, func(ctx context.Context, client *clients.ClientSet) error { health, err = helper.AssessHealth(ctx, client, request, body); return err })
	return health, err
}

func (p *kubernetesProvider) GetResourceEvents(ctx context.Context, request resourcev2.GetRequest, limit uint32) (events []resourcev2.ResourceEvent, err error) {
	if _, err := p.Get(ctx, request); err != nil { return nil, err }
	helper, ok := p.helpers[request.Reference.Address.Type].(nativeEventRetriever)
	if !ok { return nil, resourcev2.NewError("UNSUPPORTED", "Resource type does not retrieve native events") }
	err = p.WithClient(ctx, request.Route, func(ctx context.Context, client *clients.ClientSet) error { events, err = helper.GetEvents(ctx, client, request, limit); return err })
	return events, err
}

type nativeStreamingActionHelper interface { StreamAction(context.Context, *clients.ClientSet, resourcev2.ActionRequest, chan<- resourcev2.ActionEvent) error }
type nativeRelationshipDeclarer interface { DeclareRelationships() []resourcev2.RelationshipDescriptor }
type nativeRelationshipResolver interface { ResolveRelationships(context.Context, *clients.ClientSet, resourcev2.GetRequest) ([]resourcev2.ResolvedRelationship, error) }
type nativeHealthAssessor interface { AssessHealth(context.Context, *clients.ClientSet, resourcev2.GetRequest, resourcev2.Value) (*resourcev2.ResourceHealth, error) }
type nativeEventRetriever interface { GetEvents(context.Context, *clients.ClientSet, resourcev2.GetRequest, uint32) ([]resourcev2.ResourceEvent, error) }

func (p *kubernetesProvider) Features(ctx context.Context) (resourcev2.FeatureSet, error) {
	features, err := p.Controller.Features(ctx)
	if err != nil { return resourcev2.FeatureSet{}, err }
	for _, feature := range []resourcev2.Feature{
		resourcev2.FeatureConnectionBrowser,
		resourcev2.FeatureScopeValues,
		resourcev2.FeaturePresentation,
		resourcev2.FeatureEditorSchemas,
		resourcev2.FeatureSchemaDocuments,
		resourcev2.FeatureRelationships,
		resourcev2.FeatureHealth,
		resourcev2.FeatureActionCatalog,
		resourcev2.FeatureStreamingActions,
	} {
		if !features.Has(feature) { features.Traits = append(features.Traits, feature) }
	}
	return features, resourcev2.ValidateFeatures(features)
}
