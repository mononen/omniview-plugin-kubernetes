// Package helm adapts native Helm operations to the canonical resource boundary.
// Release identity uses exact namespace scope. Repository and chart identity use
// the local Helm client domain. Type and ID tokens stay opaque outside this adapter.
// Source cursors belong to native acquisition and provide best-effort paging,
// never host query continuation or atomic update continuity.
// Type actions use exact query scope and take the new resource name in input;
// they never construct an instance reference to authorize creation.
package helm

import (
	"context"
	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"go.uber.org/zap"
)

const (
	ReleaseType        = "helm:releases"
	RepositoryType     = "helm:repositories"
	ChartType          = "helm:charts"
	helmRepresentation = "helm-native-v1"
	helmLocalDomain    = "helm-client"
)

type HelmAncillary struct {
	release    *ReleaseResourcer
	repository *RepoResourcerWithActions
	chart      *ChartResourcerWithActions
}

func NewHelmAncillary(log *zap.SugaredLogger) *HelmAncillary {
	return &HelmAncillary{NewReleaseResourcer(log), NewRepoResourcerWithActions(log), NewChartResourcerWithActions(log)}
}
func (h *HelmAncillary) Registrations() []resource.Registration[clients.ClientSet] {
	out := make([]resource.Registration[clients.ClientSet], 0, 3)
	boundedReleases := supportsBoundedReleaseEnumeration()
	for _, t := range []string{ReleaseType, RepositoryType, ChartType} {
		registration := resource.Registration[clients.ClientSet]{Type: t, Get: h.Get, Enumerate: h.Enumerate, Action: h.Action}
		registration.Actions, _ = h.GetActions(context.Background(), nil, t)
		if t == ReleaseType && !boundedReleases {
			registration.Enumerate = nil
		}
		if t != ChartType {
			registration.Mutate = h.Mutate
		}
		out = append(out, registration)
	}
	return out
}
