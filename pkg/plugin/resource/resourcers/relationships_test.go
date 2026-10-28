package resourcers

import (
	"testing"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
)

func TestRelationshipTable_AllKeysPresent(t *testing.T) {
	table := RelationshipTable()

	expectedKeys := []string{
		"k8s:/pods",
		"k8s:/nodes",
		"k8s:apps/replicasets",
		"k8s:batch/jobs",
		"k8s:apps/deployments",
		"k8s:apps/daemonsets",
		"k8s:apps/statefulsets",
		"k8s:networking.k8s.io/ingresses",
		"k8s:/persistentvolumeclaims",
		"k8s:/persistentvolumes",
		"k8s:autoscaling/horizontalpodautoscalers",
		"k8s:/services",
		"k8s:networking.k8s.io/networkpolicies",
		"k8s:policy/poddisruptionbudgets",
		"k8s:rbac.authorization.k8s.io/clusterrolebindings",
		"k8s:rbac.authorization.k8s.io/rolebindings",
	}

	for _, key := range expectedKeys {
		if _, ok := table[key]; !ok {
			t.Errorf("missing key %q in RelationshipTable", key)
		}
	}
}

func TestRelationshipTable_PodRelationships(t *testing.T) {
	table := RelationshipTable()
	rels := table["k8s:/pods"]

	// Pod should have: 4 ownership (RS, DS, SS, Job) + 7 direct refs = 11
	if len(rels) != 11 {
		t.Fatalf("expected 11 Pod relationships, got %d", len(rels))
	}

	ownershipCount := 0
	for _, r := range rels {
		if r.Type == resource.RelOwns && r.Direction == resource.EdgeIncoming {
			ownershipCount++
		}
	}
	if ownershipCount != 4 {
		t.Errorf("expected 4 ownership (EdgeIncoming) declarations, got %d", ownershipCount)
	}

	for _, r := range rels {
		if r.TargetType == "k8s:/nodes" {
			if r.TargetScope == nil || len(r.TargetScope) != 0 {
				t.Errorf("Pod→Node should have empty target scope")
			}
		}
	}
}

func TestRelationshipTable_ClusterScopedTargets(t *testing.T) {
	table := RelationshipTable()

	clusterScoped := map[string]bool{
		"k8s:/nodes":                                 true,
		"k8s:/persistentvolumes":                     true,
		"k8s:storage.k8s.io/storageclasses":          true,
		"k8s:rbac.authorization.k8s.io/clusterroles": true,
		"k8s:networking.k8s.io/ingressclasses":       true,
	}

	for sourceKey, rels := range table {
		for _, r := range rels {
			if clusterScoped[r.TargetType] {
				if r.TargetScope == nil || len(r.TargetScope) != 0 {
					t.Errorf("%s → %s should have empty target scope",
						sourceKey, r.TargetType)
				}
			}
		}
	}
}

func TestRelationshipTable_ExtractorsHaveValidMethod(t *testing.T) {
	table := RelationshipTable()

	for key, rels := range table {
		for i, r := range rels {
			// Some descriptors are resolve-only (no extractor)
			if r.Extractor == nil {
				continue
			}
			switch r.Extractor.Method {
			case "fieldPath", "labelSelector", "labelSelectorObject":
			default:
				t.Errorf("%s relationship[%d] has unknown method %q", key, i, r.Extractor.Method)
			}
		}
	}
}

// TestRelationshipTable_PodSelectorsUseFullLabelSelector checks that
// resources whose selector is a metav1.LabelSelector hand the host the whole
// object (matchLabels and matchExpressions), not just matchLabels.
func TestRelationshipTable_PodSelectorsUseFullLabelSelector(t *testing.T) {
	table := RelationshipTable()

	for key, path := range map[string]string{
		"k8s:networking.k8s.io/networkpolicies": "spec.podSelector",
		"k8s:policy/poddisruptionbudgets":       "spec.selector",
	} {
		rels := table[key]
		if len(rels) != 1 || rels[0].Extractor == nil {
			t.Fatalf("%s: want one selector relationship, got %+v", key, rels)
		}
		r := rels[0]
		if r.Type != resource.RelSelects || r.TargetType != "k8s:/pods" {
			t.Errorf("%s: want selects -> k8s:/pods, got %s -> %s", key, r.Type, r.TargetType)
		}
		if r.Extractor.Method != "labelSelectorObject" || r.Extractor.FieldPath != path {
			t.Errorf("%s: want labelSelectorObject at %s, got %s at %s", key, path, r.Extractor.Method, r.Extractor.FieldPath)
		}
	}
}

func TestRelationshipNamespaceScopeExtractors(t *testing.T) {
	for source, descriptors := range RelationshipTable() {
		for _, descriptor := range descriptors {
			if descriptor.Extractor == nil {
				continue
			}
			if descriptor.TargetScope != nil {
				if len(descriptor.ScopeExtractors) != 0 {
					t.Errorf("%s: cluster target must not extract namespace", source)
				}
				continue
			}
			if len(descriptor.ScopeExtractors) != 1 ||
				descriptor.ScopeExtractors[0].Dimension != "namespace" ||
				descriptor.ScopeExtractors[0].FieldPath != "metadata.namespace" {
				t.Errorf("%s: namespaced target must extract source namespace", source)
			}
		}
	}
}
