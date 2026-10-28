// Package helm adapts native Helm operations to the canonical resource boundary.
// Release identity uses exact namespace scope. Repository and chart identity use
// the local Helm client domain. Type and ID tokens stay opaque outside this adapter.
// Source cursors belong to native acquisition and provide best-effort paging,
// never host query continuation or atomic update continuity.
package helm
import (
 "context"
 "fmt"
 "strconv"
 "sort"
 "os"
 "path/filepath"
 "strings"
 "github.com/omniview/kubernetes/pkg/plugin/resource/clients"
 resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
 "go.uber.org/zap"
 "helm.sh/helm/v3/pkg/action"
 "helm.sh/helm/v3/pkg/cli"
 "helm.sh/helm/v3/pkg/repo"
)
const (ReleaseType="helm:releases"; RepositoryType="helm:repositories"; ChartType="helm:charts"; helmRepresentation="helm-native-v1"; helmLocalDomain="helm-client")
func HelmResourceGroup() resource.ResourceGroup {return resource.ResourceGroup{ID:"helm",Name:"Helm",Icon:"SiHelm",Resources:[]string{ReleaseType,RepositoryType,ChartType}}}
func helmRepresentationDescriptor() resource.Representation {return resource.Representation{ID:helmRepresentation,Revision:"1",Schema:resource.SchemaBinding{State:"absent",Validation:"none",Unvalidated:[]string{}}}}
func HelmResourceTypes() []resource.ResourceType {
	out := make([]resource.ResourceType, 0, 3)
	boundedReleases := supportsBoundedReleaseEnumeration()
	for _, token := range []string{ReleaseType, RepositoryType, ChartType} {
		dimensions := []resource.Dimension{{Name: "domain"}}
		if token == ReleaseType { dimensions = []resource.Dimension{{Name: "namespace"}} }
		capabilities := []resource.Capability{{Operation: resource.OperationGet}, {Operation: resource.OperationAction}}
		if token != ReleaseType || boundedReleases {
			capabilities = append(capabilities, resource.Capability{Operation: resource.OperationEnumerate})
		}
		if token != ChartType { capabilities = append(capabilities, resource.Capability{Operation: resource.OperationMutation}) }
		out = append(out, resource.ResourceType{
			Type: token,
			DisplayName: map[string]string{ReleaseType: "Release", RepositoryType: "Repository", ChartType: "Chart"}[token],
			IdentityDimensions: dimensions,
			QueryDimensions: dimensions,
			Representations: []resource.Representation{helmRepresentationDescriptor()},
			Capabilities: capabilities,
		})
	}
	return out
}
func namespaceOf(ref resource.ResourceReference) string {for _,s:=range ref.Address.Scope {if s.Dimension=="namespace" {return s.Value}};return ""}
func nativeObject(value resource.Value) (map[string]interface{}, error) {
	native, err := resource.NativeFromValue(value)
	if err != nil { return nil, err }
	if native == nil { return nil, nil }
	object, ok := native.(map[string]interface{})
	if !ok { return nil, resource.NewError("INVALID_REQUEST", "Helm action input must be an object or null") }
	return object, nil
}
func actionParams(request resource.ActionRequest) (map[string]interface{}, error) {
	return nativeObject(request.Input)
}
func validateReference(ref resource.ResourceReference) error {a:=ref.Address;if len(a.Scope)!=1{return fmt.Errorf("Helm identity requires exactly one native scope dimension")}; if a.Type==ReleaseType {if a.Scope[0].Dimension!="namespace"||a.Scope[0].Value=="" {return fmt.Errorf("release namespace required")}} else if a.Scope[0].Dimension!="domain"||a.Scope[0].Value!=helmLocalDomain {return fmt.Errorf("Helm client domain required")}; return nil}
func helmRecord(ref resource.ResourceReference,body map[string]interface{}) (resource.Record,error) {v,e:=resource.ValueFromNative(body);if e!=nil{return resource.Record{},e};return resource.Record{Reference:ref,Body:v,Representation:helmRepresentationDescriptor(),Coverage:resource.Coverage{Kind:"complete"}},nil}
func pageBounds(request resource.EnumerateRequest) (int, int, error) {
	size := int(request.PageSize)
	if size == 0 { size = 256 }
	if size > 256 { return 0, 0, fmt.Errorf("page size exceeds 256") }
	offset := 0
	if request.Cursor != nil {
		var err error
		offset, err = strconv.Atoi(*request.Cursor)
		if err != nil || offset < 0 || offset > int(^uint(0)>>1)-size {
			return 0, 0, fmt.Errorf("invalid Helm source cursor")
		}
	}
	return size, offset, nil
}
func targetReference(t resource.ReadTarget,id string,scope []resource.ScopeEntry)resource.ResourceReference{return resource.ResourceReference{Address:resource.ResourceAddress{Provider:t.Provider,Authority:t.Authority,Type:t.Type,ID:id,Scope:scope}}}
func queryScope(t resource.ReadTarget)([]resource.ScopeEntry,error){
 dimension,value:="domain",helmLocalDomain
 if t.Type==ReleaseType{dimension="namespace";value=""}
 if len(t.Scope)==0 || len(t.Scope)==1 && t.Scope[0].Dimension==dimension && t.Scope[0].Match==resource.ScopeAny {
  return []resource.ScopeEntry{{Dimension:dimension,Value:value}},nil
 }
 if len(t.Scope)!=1||t.Scope[0].Dimension!=dimension||t.Scope[0].Match!=resource.ScopeOneOf||t.Scope[0].Values==nil||len(*t.Scope[0].Values)!=1{return nil,fmt.Errorf("Helm enumeration requires any scope or one exact native scope")}
 v:=(*t.Scope[0].Values)[0]
 if dimension=="namespace"&&v==""||dimension=="domain"&&v!=value{return nil,fmt.Errorf("invalid Helm native scope")}
 return []resource.ScopeEntry{{Dimension:dimension,Value:v}},nil
}
func finishPage(records []resource.Record,offset,size int,more bool)resource.SourcePage{p:=resource.SourcePage{Records:records,Count:resource.Count{Kind:"unknown"},Coverage:resource.Coverage{Kind:"complete"},Consistency:"bestEffort"};if more{c:=strconv.Itoa(offset+size);p.NextCursor=&c};return p}
type HelmAncillary struct{release *ReleaseResourcer; repository *RepoResourcerWithActions; chart *ChartResourcerWithActions}
func NewHelmAncillary(log *zap.SugaredLogger,svc *HelmService)*HelmAncillary{return &HelmAncillary{NewReleaseResourcer(log,svc),NewRepoResourcerWithActions(log),NewChartResourcerWithActions(log)}}
func(h *HelmAncillary)GetActions(ctx context.Context,c *clients.ClientSet,t string)([]resource.ActionDescriptor,error){switch t{case ReleaseType:return h.release.GetActions(ctx,c);case RepositoryType:return h.repository.GetActions(ctx,c);case ChartType:return h.chart.GetActions(ctx,c)};return nil,fmt.Errorf("unknown Helm type")}
func(h *HelmAncillary)GetEditorSchemas(ctx context.Context,c *clients.ClientSet)([]resource.EditorSchema,error){return h.release.GetEditorSchemas(ctx,c)}
func(h *HelmAncillary)StreamAction(context.Context,*clients.ClientSet,resource.ActionRequest,chan<-resource.ActionEvent)error{return resource.NewError("UNSUPPORTED","Helm exposes no streaming actions")}
func HelmRegistrations(log *zap.SugaredLogger,svc *HelmService)[]resource.Registration[clients.ClientSet]{
 h:=NewHelmAncillary(log,svc)
 out:=make([]resource.Registration[clients.ClientSet],0,3)
 boundedReleases:=supportsBoundedReleaseEnumeration()
 for _,t:=range []string{ReleaseType,RepositoryType,ChartType}{
  registration:=resource.Registration[clients.ClientSet]{Type:t,Get:h.Get,Enumerate:h.Enumerate,Action:h.Action}
  if t==ReleaseType && !boundedReleases { registration.Enumerate=nil }
  if t!=ChartType{registration.Mutate=h.Mutate}
  out=append(out,registration)
 }
 return out
}
func (h *HelmAncillary) Get(ctx context.Context, client *clients.ClientSet, request resource.GetRequest) (resource.Record, error) {
	if err := validateReference(request.Reference); err != nil { return resource.Record{}, err }
	if request.Representation != "" && request.Representation != helmRepresentation {
		return resource.Record{}, resource.NewError("UNSUPPORTED", "unknown Helm representation")
	}
	switch request.Reference.Address.Type {
	case ReleaseType:
		cfg, err := h.release.getConfig(ctx, client, namespaceOf(request.Reference))
		if err != nil { return resource.Record{}, err }
		get := action.NewGet(cfg)
		if supportsBoundedReleaseEnumeration() {
			version, err := latestReleaseVersion(ctx, client, namespaceOf(request.Reference), request.Reference.Address.ID)
			if err != nil { return resource.Record{}, err }
			get.Version = version
		}
		rel, err := get.Run(request.Reference.Address.ID)
		if err != nil { return resource.Record{}, err }
		return helmRecord(request.Reference, releaseToMap(rel))
	case RepositoryType:
		file, err := loadRepoFile()
		if err != nil { return resource.Record{}, err }
		for _, entry := range file.Repositories {
			if entry.Name == request.Reference.Address.ID { return helmRecord(request.Reference, repoEntryToMap(entry)) }
		}
	case ChartType:
		parts := strings.SplitN(request.Reference.Address.ID, "/", 2)
		if len(parts) != 2 { return resource.Record{}, resource.NewError("INVALID_REQUEST", "chart ID must be repo/chart") }
		index, err := loadIndex(parts[0])
		if err != nil { return resource.Record{}, err }
		versions := index.Entries[parts[1]]
		if len(versions) > 0 { return helmRecord(request.Reference, chartVersionToMap(parts[0], versions[0])) }
	}
	return resource.Record{}, resource.NewError("NOT_FOUND", "Helm resource not found")
}
func loadIndex(name string)(*repo.IndexFile,error){path:=filepath.Join(cli.New().RepositoryCache,name+"-index.yaml");info,e:=os.Stat(path);if e!=nil{return nil,e};if info.Size()>16<<20{return nil,fmt.Errorf("Helm index exceeds 16 MiB")};return repo.LoadIndexFile(path)}
func(h *HelmAncillary)Enumerate(ctx context.Context,c *clients.ClientSet,r resource.EnumerateRequest)(resource.SourcePage,error){if r.Target.Representation!=""&&r.Target.Representation!=helmRepresentation{return resource.SourcePage{},fmt.Errorf("unknown Helm representation")};if r.Target.Type==ReleaseType{return h.enumerateReleases(ctx,c,r)};size,offset,e:=pageBounds(r);if e!=nil{return resource.SourcePage{},e};scope,e:=queryScope(r.Target);if e!=nil{return resource.SourcePage{},e};records:=make([]resource.Record,0,size);more:=false;budget:=0;add:=func(id string,body map[string]interface{})error{rec,e:=helmRecord(targetReference(r.Target,id,scope),body);if e!=nil{return e};encodedSize,e:=resource.RecordWireSize(rec);if e!=nil{return e};if encodedSize>(32<<20)-budget{return fmt.Errorf("Helm source page exceeds 32 MiB")};budget+=encodedSize;records=append(records,rec);return nil};switch r.Target.Type{case RepositoryType,ChartType:f,e:=loadRepoFile();if e!=nil{return resource.SourcePage{},e};sort.Slice(f.Repositories,func(i,j int)bool{return f.Repositories[i].Name<f.Repositories[j].Name});seen:=0;for _,entry:=range f.Repositories{if r.Target.Type==RepositoryType{if seen>=offset&&len(records)<size{if e=add(entry.Name,repoEntryToMap(entry));e!=nil{return resource.SourcePage{},e}};seen++;if seen>offset+size{more=true;break};continue};idx,e:=loadIndex(entry.Name);if os.IsNotExist(e){continue};if e!=nil{return resource.SourcePage{},e};names:=make([]string,0,len(idx.Entries));for name:=range idx.Entries{names=append(names,name)};sort.Strings(names);for _,name:=range names{versions:=idx.Entries[name];if len(versions)==0{continue};if seen>=offset&&len(records)<size{if e=add(entry.Name+"/"+name,chartVersionToMap(entry.Name,versions[0]));e!=nil{return resource.SourcePage{},e}};seen++;if seen>offset+size{more=true;break}};if more{break}};default:return resource.SourcePage{},fmt.Errorf("unknown Helm type")};return finishPage(records,offset,size,more),nil}
func(h *HelmAncillary)Action(ctx context.Context,c *clients.ClientSet,r resource.ActionRequest)(resource.Value,error){if e:=validateReference(r.Reference);e!=nil{return resource.Value{},e};if e:=validateActionInput(r);e!=nil{return resource.Value{},e};switch r.Reference.Address.Type{case ReleaseType:return h.release.Action(ctx,c,r);case RepositoryType:return h.repository.Action(ctx,c,r);case ChartType:return h.chart.Action(ctx,c,r)};return resource.Value{},fmt.Errorf("unknown Helm type")}
func(h *HelmAncillary)Mutate(ctx context.Context,c *clients.ClientSet,r resource.MutationRequest)(resource.Record,error){if e:=validateReference(r.Reference);e!=nil{return resource.Record{},e};if r.ExpectedRevision!=nil{return resource.Record{},fmt.Errorf("Helm conditional mutations unsupported")};if r.Operation=="delete"{switch r.Reference.Address.Type{case ReleaseType:cfg,e:=h.release.getConfig(ctx,c,namespaceOf(r.Reference));if e!=nil{return resource.Record{},e};_,e=action.NewUninstall(cfg).Run(r.Reference.Address.ID);if e!=nil{return resource.Record{},e};case RepositoryType:f,e:=loadRepoFile();if e!=nil{return resource.Record{},e};if !f.Remove(r.Reference.Address.ID){return resource.Record{},fmt.Errorf("repository not found")};if e=f.WriteFile(repoFile(),0600);e!=nil{return resource.Record{},e};_ = os.Remove(filepath.Join(cli.New().RepositoryCache,r.Reference.Address.ID+"-index.yaml"));default:return resource.Record{},fmt.Errorf("unsupported Helm mutation")};return helmRecord(r.Reference,map[string]interface{}{"name":r.Reference.Address.ID})};actionID:="";if r.Operation=="create"{if r.Reference.Address.Type==ReleaseType{actionID="install"}else if r.Reference.Address.Type==RepositoryType{actionID="add"}};if actionID==""{return resource.Record{},fmt.Errorf("unsupported Helm mutation")};v,e:=h.Action(ctx,c,resource.ActionRequest{Route:r.Route,Reference:r.Reference,Action:actionID,Input:r.Input});if e!=nil{return resource.Record{},e};return resource.Record{Reference:r.Reference,Body:v.Map["data"],Representation:helmRepresentationDescriptor(),Coverage:resource.Coverage{Kind:"complete"}},nil}

func HelmResourceDefinitions() map[string]resource.ResourceDefinition {
	return map[string]resource.ResourceDefinition{
		ReleaseType: {
			ColumnDefs: []resource.ColumnDefinition{
				{
					ID:        "name",
					Header:    "Name",
					Accessors: "name",
				},
				{
					ID:        "namespace",
					Header:    "Namespace",
					Accessors: "namespace",
				},
				{
					ID:        "chart",
					Header:    "Chart",
					Accessors: "chart.metadata.name",
				},
				{
					ID:        "app_version",
					Header:    "App Version",
					Accessors: "chart.metadata.appVersion",
				},
				{
					ID:        "revision",
					Header:    "Revision",
					Accessors: "version",
				},
				{
					ID:        "status",
					Header:    "Status",
					Accessors: "info.status",
					ColorMap: map[string]string{
						"deployed":         "success",
						"failed":           "danger",
						"pending-install":  "warning",
						"pending-upgrade":  "warning",
						"pending-rollback": "warning",
						"superseded":       "neutral",
						"uninstalling":     "warning",
						"uninstalled":      "neutral",
					},
				},
				{
					ID:        "updated",
					Header:    "Updated",
					Accessors: "info.last_deployed",
					Formatter: "AGE",
				},
			},
		},
		RepositoryType: {
			ColumnDefs: []resource.ColumnDefinition{
				{
					ID:        "name",
					Header:    "Name",
					Accessors: "name",
				},
				{
					ID:        "url",
					Header:    "URL",
					Accessors: "url",
				},
			},
		},
		ChartType: {
			ColumnDefs: []resource.ColumnDefinition{
				{
					ID:        "name",
					Header:    "Name",
					Accessors: "name",
				},
				{
					ID:        "description",
					Header:    "Description",
					Accessors: "description",
				},
				{
					ID:        "version",
					Header:    "Version",
					Accessors: "version",
				},
				{
					ID:        "appVersion",
					Header:    "App Version",
					Accessors: "appVersion",
				},
				{
					ID:        "repository",
					Header:    "Repository",
					Accessors: "repository",
				},
			},
		},
	}
}

