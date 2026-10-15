package resourcers

import (
	"testing"

	resource "github.com/omniviewdev/plugin-sdk/pkg/v1/resource"
)

func TestRelationshipTable_AllKeysPresent(t *testing.T) {
	table := RelationshipTable()

	expectedKeys := []string{
		"core::v1::Pod",
		"core::v1::Node",
		"apps::v1::ReplicaSet",
		"batch::v1::Job",
		"apps::v1::Deployment",
		"apps::v1::DaemonSet",
		"apps::v1::StatefulSet",
		"networking::v1::Ingress",
		"core::v1::PersistentVolumeClaim",
		"core::v1::PersistentVolume",
		"autoscaling::v2::HorizontalPodAutoscaler",
		"core::v1::Service",
		"networking::v1::NetworkPolicy",
		"policy::v1::PodDisruptionBudget",
		"rbac::v1::ClusterRoleBinding",
		"rbac::v1::RoleBinding",
	}

	for _, key := range expectedKeys {
		if _, ok := table[key]; !ok {
			t.Errorf("missing key %q in RelationshipTable", key)
		}
	}
}

func TestRelationshipTable_PodRelationships(t *testing.T) {
	table := RelationshipTable()
	rels := table["core::v1::Pod"]

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
		if r.TargetResourceKey == "core::v1::Node" {
			if r.TargetNamespaced == nil || *r.TargetNamespaced != false {
				t.Errorf("Pod→Node should have TargetNamespaced=false")
			}
		}
	}
}

func TestRelationshipTable_ClusterScopedTargets(t *testing.T) {
	table := RelationshipTable()

	clusterScoped := map[string]bool{
		"core::v1::Node":               true,
		"core::v1::PersistentVolume":   true,
		"storage::v1::StorageClass":    true,
		"rbac::v1::ClusterRole":        true,
		"networking::v1::IngressClass": true,
	}

	for sourceKey, rels := range table {
		for _, r := range rels {
			if clusterScoped[r.TargetResourceKey] {
				if r.TargetNamespaced == nil || *r.TargetNamespaced != false {
					t.Errorf("%s → %s should have TargetNamespaced=false",
						sourceKey, r.TargetResourceKey)
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
		"networking::v1::NetworkPolicy":   "spec.podSelector",
		"policy::v1::PodDisruptionBudget": "spec.selector",
	} {
		rels := table[key]
		if len(rels) != 1 || rels[0].Extractor == nil {
			t.Fatalf("%s: want one selector relationship, got %+v", key, rels)
		}
		r := rels[0]
		if r.Type != resource.RelSelects || r.TargetResourceKey != "core::v1::Pod" {
			t.Errorf("%s: want selects -> core::v1::Pod, got %s -> %s", key, r.Type, r.TargetResourceKey)
		}
		if r.Extractor.Method != "labelSelectorObject" || r.Extractor.FieldPath != path {
			t.Errorf("%s: want labelSelectorObject at %s, got %s at %s", key, path, r.Extractor.Method, r.Extractor.FieldPath)
		}
	}
}
