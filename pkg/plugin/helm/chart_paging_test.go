package helm

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/repo"
	"k8s.io/client-go/rest"
)

func chartPagingFixture(t *testing.T) string {
	t.Helper()
	directory := t.TempDir()
	t.Setenv("HELM_REPOSITORY_CONFIG", filepath.Join(directory, "repositories.yaml"))
	t.Setenv("HELM_REPOSITORY_CACHE", directory)
	file := repo.NewFile()
	file.Add(&repo.Entry{Name: "a-global", URL: "https://unused.invalid/global"})
	file.Add(&repo.Entry{Name: "z-selected", URL: "https://unused.invalid/selected"})
	require.NoError(t, file.WriteFile(repoFile(), 0600))
	for _, name := range []string{"a-global", "z-selected"} {
		index := repo.NewIndexFile()
		for i := range 258 {
			chartName := fmt.Sprintf("chart-%03d", i)
			index.Entries[chartName] = repo.ChartVersions{{Metadata: &chart.Metadata{Name: chartName, Version: "1.0.0", APIVersion: "v2"}}}
		}
		require.NoError(t, index.WriteFile(filepath.Join(directory, name+"-index.yaml"), 0600))
	}
	return directory
}

func selectedChartTarget(name string) resource.ReadTarget {
	domain, repository := []string{helmLocalDomain}, []string{name}
	return resource.ReadTarget{
		Route: resource.AccessRoute{Connection: "explicit"}, Provider: "kubernetes", Authority: "host-issued", Type: ChartType,
		Representation: helmRepresentation,
		Scope: resource.QueryScope{
			{Dimension: "domain", Match: resource.ScopeOneOf, Values: &domain},
			{Dimension: "repository", Match: resource.ScopeOneOf, Values: &repository},
		},
	}
}

func TestChartRepositoryQueryBeforeBoundedPagination(t *testing.T) {
	chartPagingFixture(t)
	adapter := &HelmAncillary{}
	global, err := adapter.Enumerate(context.Background(), nil, resource.EnumerateRequest{
		Target: resource.ReadTarget{Route: resource.AccessRoute{Connection: "explicit"}, Provider: "kubernetes", Authority: "host-issued", Type: ChartType, Representation: helmRepresentation, Scope: resource.QueryScope{{Dimension: "domain", Match: resource.ScopeAny}, {Dimension: "repository", Match: resource.ScopeAny}}}, PageSize: 256,
	})
	require.NoError(t, err)
	require.Len(t, global.Records, 256)
	assert.Equal(t, "a-global", global.Records[0].Body.Map["repository"].String)

	request := resource.EnumerateRequest{Target: selectedChartTarget("z-selected"), PageSize: 256}
	first, err := adapter.Enumerate(context.Background(), nil, request)
	require.NoError(t, err)
	require.Len(t, first.Records, 256)
	require.NotNil(t, first.NextCursor)
	assert.Equal(t, "unknown", first.Count.Kind)
	assert.Equal(t, "bestEffort", first.Consistency)
	for _, record := range first.Records {
		assert.Equal(t, "z-selected", record.Body.Map["repository"].String)
		assert.Equal(t, ChartType, record.Reference.Address.Type)
		assert.Equal(t, []resource.ScopeEntry{{Dimension: "domain", Value: helmLocalDomain}}, record.Reference.Address.Scope)
	}
	assert.Equal(t, "z-selected/chart-000", first.Records[0].Reference.Address.ID)
	request.Cursor = first.NextCursor
	last, err := adapter.Enumerate(context.Background(), nil, request)
	require.NoError(t, err)
	require.Len(t, last.Records, 2)
	assert.Nil(t, last.NextCursor)
	assert.Equal(t, "z-selected/chart-256", last.Records[0].Reference.Address.ID)
	assert.Equal(t, "unknown", last.Count.Kind)
}

func TestChartRepositoryQueryDoesNotReadUnselectedIndex(t *testing.T) {
	directory := chartPagingFixture(t)
	require.NoError(t, os.WriteFile(filepath.Join(directory, "a-global-index.yaml"), []byte("not: [valid"), 0600))
	page, err := (&HelmAncillary{}).Enumerate(context.Background(), nil, resource.EnumerateRequest{Target: selectedChartTarget("z-selected"), PageSize: 1})
	require.NoError(t, err)
	require.Len(t, page.Records, 1)
	_, err = (&HelmAncillary{}).Enumerate(context.Background(), nil, resource.EnumerateRequest{Target: selectedChartTarget("not-configured"), PageSize: 1})
	assert.Equal(t, "NOT_FOUND", resource.ErrorCode(err))
}

func TestChartRepositoryIsQueryDimensionOnly(t *testing.T) {
	for _, descriptor := range HelmResourceTypes() {
		if descriptor.Type != ChartType {
			continue
		}
		assert.Equal(t, []resource.Dimension{{Name: "domain"}}, descriptor.IdentityDimensions)
		assert.Equal(t, []resource.Dimension{{Name: "domain"}, {Name: "repository"}}, descriptor.QueryDimensions)
		return
	}
	t.Fatal("chart descriptor missing")
}

func TestHelmEmptySelectionSkipsNativeAndFilesystemAcquisition(t *testing.T) {
	t.Setenv("HELM_DRIVER", "secrets")
	// A regular file used as a directory makes even Stat fail with ENOTDIR.
	// Reading repositories or indexes therefore cannot masquerade as empty data.
	blocked := filepath.Join(t.TempDir(), "not-a-directory")
	require.NoError(t, os.WriteFile(blocked, []byte("must not acquire"), 0600))
	t.Setenv("HELM_REPOSITORY_CONFIG", filepath.Join(blocked, "repositories.yaml"))
	t.Setenv("HELM_REPOSITORY_CACHE", filepath.Join(blocked, "indexes"))
	var requests atomic.Int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		http.Error(w, "must not acquire", http.StatusInternalServerError)
	}))
	t.Cleanup(server.Close)
	client := &clients.ClientSet{RESTConfig: &rest.Config{Host: server.URL}, HTTPClient: server.Client()}
	empty, domain, repository := []string{}, []string{helmLocalDomain}, []string{"not-configured"}
	for _, tc := range []struct {
		name  string
		typ   string
		scope resource.QueryScope
	}{
		{"release namespace", ReleaseType, resource.QueryScope{{Dimension: "namespace", Match: resource.ScopeOneOf, Values: &empty}}},
		{"repository domain", RepositoryType, resource.QueryScope{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}}},
		{"chart domain", ChartType, resource.QueryScope{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "repository", Match: resource.ScopeOneOf, Values: &repository}}},
		{"chart repository", ChartType, resource.QueryScope{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &domain}, {Dimension: "repository", Match: resource.ScopeOneOf, Values: &empty}}},
		{"chart repository any domain", ChartType, resource.QueryScope{{Dimension: "domain", Match: resource.ScopeAny}, {Dimension: "repository", Match: resource.ScopeOneOf, Values: &empty}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := resource.EnumerateRequest{Target: resource.ReadTarget{
				Route: resource.AccessRoute{Connection: "explicit"}, Provider: "kubernetes", Authority: "host-issued",
				Type: tc.typ, Representation: helmRepresentation, Scope: tc.scope,
			}, PageSize: 1}
			require.NoError(t, resource.ValidateEnumerateRequest(request))
			page, err := (&HelmAncillary{}).Enumerate(context.Background(), client, request)
			require.NoError(t, err)
			assert.NotNil(t, page.Records)
			assert.Empty(t, page.Records)
			assert.Nil(t, page.NextCursor)
			assert.Equal(t, "complete", page.Coverage.Kind)
			assert.Equal(t, "bestEffort", page.Consistency)
			assert.Equal(t, "unknown", page.Count.Kind)
			require.NoError(t, resource.ValidateSourcePage(page))
			assert.Zero(t, requests.Load(), "empty selections must not issue native requests")
		})
	}
}

func TestHelmEmptySelectionDoesNotMaskInvalidScope(t *testing.T) {
	empty, invalidDomain, invalidRepository := []string{}, []string{"foreign-domain"}, []string{""}
	for _, scope := range []resource.QueryScope{
		{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "unknown", Match: resource.ScopeAny}},
		{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "domain", Match: resource.ScopeAny}},
		{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "repository", Match: resource.ScopeOneOf}},
		{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "repository", Match: resource.ScopeAny, Values: &empty}},
		{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &invalidDomain}, {Dimension: "repository", Match: resource.ScopeOneOf, Values: &empty}},
		{{Dimension: "repository", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "domain", Match: resource.ScopeOneOf, Values: &invalidDomain}},
		{{Dimension: "domain", Match: resource.ScopeOneOf, Values: &empty}, {Dimension: "repository", Match: resource.ScopeOneOf, Values: &invalidRepository}},
	} {
		_, err := (&HelmAncillary{}).Enumerate(context.Background(), nil, resource.EnumerateRequest{
			Target: resource.ReadTarget{Type: ChartType, Representation: helmRepresentation, Scope: scope},
		})
		require.Error(t, err)
	}
}
