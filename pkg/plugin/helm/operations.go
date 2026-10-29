package helm

import (
	"context"
	"fmt"
	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/cli"
	"os"
	"path/filepath"
)

func (h *HelmAncillary) GetActions(ctx context.Context, c *clients.ClientSet, t string) ([]resource.ActionDescriptor, error) {
	switch t {
	case ReleaseType:
		return h.release.GetActions(ctx, c)
	case RepositoryType:
		return h.repository.GetActions(ctx, c)
	case ChartType:
		return h.chart.GetActions(ctx, c)
	}
	return nil, fmt.Errorf("unknown Helm type")
}

func (h *HelmAncillary) StreamAction(context.Context, *clients.ClientSet, resource.ActionRequest, chan<- resource.ActionEvent) error {
	return resource.NewError("UNSUPPORTED", "Helm exposes no streaming actions")
}

func (h *HelmAncillary) Action(ctx context.Context, c *clients.ClientSet, r resource.ActionRequest) (resource.Value, error) {
	if e := validateReference(r.Reference); e != nil {
		return resource.Value{}, e
	}
	if e := validateActionInput(r); e != nil {
		return resource.Value{}, e
	}
	switch r.Reference.Address.Type {
	case ReleaseType:
		return h.release.Action(ctx, c, r)
	case RepositoryType:
		return h.repository.Action(ctx, c, r)
	case ChartType:
		return h.chart.Action(ctx, c, r)
	}
	return resource.Value{}, fmt.Errorf("unknown Helm type")
}
func (h *HelmAncillary) Mutate(ctx context.Context, c *clients.ClientSet, r resource.MutationRequest) (resource.Record, error) {
	if e := validateReference(r.Reference); e != nil {
		return resource.Record{}, e
	}
	if r.ExpectedRevision != nil {
		return resource.Record{}, fmt.Errorf("Helm conditional mutations unsupported")
	}
	if r.Operation == "delete" {
		switch r.Reference.Address.Type {
		case ReleaseType:
			cfg, e := h.release.getConfig(ctx, c, namespaceOf(r.Reference))
			if e != nil {
				return resource.Record{}, e
			}
			_, e = action.NewUninstall(cfg).Run(r.Reference.Address.ID)
			if e != nil {
				return resource.Record{}, e
			}
		case RepositoryType:
			f, e := loadRepoFile()
			if e != nil {
				return resource.Record{}, e
			}
			if !f.Remove(r.Reference.Address.ID) {
				return resource.Record{}, fmt.Errorf("repository not found")
			}
			if e = f.WriteFile(repoFile(), 0600); e != nil {
				return resource.Record{}, e
			}
			_ = os.Remove(filepath.Join(cli.New().RepositoryCache, r.Reference.Address.ID+"-index.yaml"))
		default:
			return resource.Record{}, fmt.Errorf("unsupported Helm mutation")
		}
		return helmRecord(r.Reference, map[string]interface{}{"name": r.Reference.Address.ID})
	}
	actionID := ""
	if r.Operation == "create" {
		if r.Reference.Address.Type == ReleaseType {
			actionID = "install"
		} else if r.Reference.Address.Type == RepositoryType {
			actionID = "add"
		}
	}
	if actionID == "" {
		return resource.Record{}, fmt.Errorf("unsupported Helm mutation")
	}
	v, e := h.Action(ctx, c, resource.ActionRequest{Route: r.Route, Reference: r.Reference, Action: actionID, Input: r.Input})
	if e != nil {
		return resource.Record{}, e
	}
	return resource.Record{Reference: r.Reference, Body: v.Map["data"], Representation: helmRepresentationDescriptor(), Coverage: resource.Coverage{Kind: "complete"}}, nil
}
