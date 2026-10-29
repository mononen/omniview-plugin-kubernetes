package resource

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
)

// assembleNativeCatalog builds an unpublished snapshot. The startup caller owns
// acquisition cancellation, schema leases, retirement fencing, and publication.
func (p *kubernetesProvider) assembleNativeCatalog(ctx context.Context, connectionID string, client *clients.ClientSet, bindings map[string]nativeType, coverage resourcev2.Coverage, schemas map[string]nativeSchemaDocument, failures map[string]error, identityHint *resourcev2.NativeAuthorityHint, watchScope resourcev2.QueryScope) (*nativeCatalogSnapshot, error) {
	registrations := make(map[string]resourcev2.Registration[clients.ClientSet], len(bindings))
	documents := make(map[resourcev2.SchemaDocumentReference]resourcev2.SchemaDocument)
	for token, binding := range bindings {
		representation := resourcev2.Representation{
			ID:       nativeRepresentationVersion + "/" + binding.GVR.GroupVersion().String(),
			Revision: nativeRepresentationVersion + "/" + binding.GVR.GroupVersion().String(),
			Schema:   resourcev2.SchemaBinding{State: "unavailable", Validation: "none", Unvalidated: []string{}},
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
			if err != nil {
				return nil, err
			}
			if len(descriptors) != 0 {
				binding.Descriptor.Capabilities = append(binding.Descriptor.Capabilities, resourcev2.Capability{Operation: resourcev2.OperationAction, Scope: nativeTypeScope(binding)})
			}
		}
		binding.Descriptor.DefaultRepresentation = representation.ID
		binding.Descriptor.NativeAuthorityHint = identityHint
		if verbSliceContains(binding.API.Verbs, "list") && verbSliceContains(binding.API.Verbs, "watch") {
			scope := nativeTypeScope(binding)
			if binding.API.Namespaced {
				scope = watchScope
			}
			binding.Descriptor.Capabilities = append(binding.Descriptor.Capabilities, resourcev2.Capability{Operation: resourcev2.OperationUpdate, Scope: scope, Guarantee: resourcev2.BestEffortGuarantee})
		}
		bindings[token] = binding
		registrations[token] = p.nativeRegistration(resourcev2.AccessRoute{Connection: connectionID}, binding)
	}
	catalog := resourcev2.Catalog{Provider: "kubernetes", Types: sortedNativeTypes(bindings), Coverage: coverage}
	catalog.Types = append(catalog.Types, p.helmTypes...)
	catalog.Types = append(catalog.Types, auditResourceType())
	for index := range catalog.Types {
		if catalog.Types[index].Type == "helm:releases" {
			catalog.Types[index].NativeAuthorityHint = identityHint
		}
	}
	encoded, err := json.Marshal(struct {
		Provider string                    `json:"provider"`
		Types    []resourcev2.ResourceType `json:"types"`
		Coverage resourcev2.Coverage       `json:"coverage"`
	}{catalog.Provider, catalog.Types, catalog.Coverage})
	if err != nil {
		return nil, err
	}
	digest := sha256.Sum256(encoded)
	catalog.Revision = hex.EncodeToString(digest[:])
	if err := resourcev2.ValidateCatalog(catalog); err != nil {
		return nil, err
	}
	return &nativeCatalogSnapshot{catalog: catalog, bindings: bindings, registrations: registrations, documents: documents, identityHint: identityHint}, nil
}
