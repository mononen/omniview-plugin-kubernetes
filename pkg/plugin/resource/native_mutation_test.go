package resource

import (
 "context"
 "errors"
 "testing"
 resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
 "github.com/stretchr/testify/require"
 metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
 "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
 "k8s.io/apimachinery/pkg/runtime"
 clienttesting "k8s.io/client-go/testing"
)

func boundaryMutation(t *testing.T, operation string) resourcev2.MutationRequest {
 t.Helper()
 body,err:=resourcev2.ValueFromNative(boundaryObject("native-name","selected").Object)
 require.NoError(t,err)
 if operation=="delete"{body=resourcev2.Value{Kind:"null"}}
 return resourcev2.MutationRequest{Route:boundaryGet().Route,Reference:boundaryGet().Reference,Operation:operation,Input:body}
}
func mutationToken(value string)*string{return &value}

func TestNativeMutationVerbsAreIndependent(t *testing.T){
 for _,allowed:=range []string{"create","update","delete"}{
  for _,operation:=range []string{"create","update","delete"}{
   t.Run(allowed+"/"+operation,func(t *testing.T){
    backend:=boundaryClient()
    if operation!="create"{backend=boundaryClient(boundaryObject("native-name","selected"))}
    record,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{allowed},boundaryMutation(t,operation),boundaryRepresentation())
    if allowed!=operation{require.Equal(t,"UNSUPPORTED",resourcev2.ErrorCode(err));require.Empty(t,backend.Actions());return}
    require.NoError(t,err);require.Equal(t,boundaryGet().Reference.Address,record.Reference.Address)
    require.Equal(t,boundaryRepresentation(),record.Representation)
   })
  }
 }
}

func TestNativeMutationExactIdentityAndScope(t *testing.T){
 cases:=[]struct{name string; change func(*resourcev2.MutationRequest)}{
  {"body name",func(r *resourcev2.MutationRequest){r.Input.Map["metadata"].Map["name"]=resourcev2.Value{Kind:"string",String:"different"}}},
  {"body namespace",func(r *resourcev2.MutationRequest){r.Input.Map["metadata"].Map["namespace"]=resourcev2.Value{Kind:"string",String:"other"}}},
  {"missing scope",func(r *resourcev2.MutationRequest){r.Reference.Address.Scope=nil}},
  {"unknown scope",func(r *resourcev2.MutationRequest){r.Reference.Address.Scope=[]resourcev2.ScopeEntry{{Dimension:"region",Value:"selected"}}}},
  {"create UID",func(r *resourcev2.MutationRequest){r.Reference.Incarnation=mutationToken("uid-1")}},
  {"create revision",func(r *resourcev2.MutationRequest){r.ExpectedRevision=mutationToken("opaque:9")}},
 }
 for _,test:=range cases{t.Run(test.name,func(t *testing.T){backend:=boundaryClient();request:=boundaryMutation(t,"create");test.change(&request);_,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"create"},request,boundaryRepresentation());require.Equal(t,"INVALID_REQUEST",resourcev2.ErrorCode(err));require.Empty(t,backend.Actions())})}
}

func TestNativeMutationUpdatePreconditionsAndExactInteger(t *testing.T){
 backend:=boundaryClient(boundaryObject("native-name","selected"))
 request:=boundaryMutation(t,"update")
 request.Reference.Incarnation=mutationToken("uid-1");request.ExpectedRevision=mutationToken("opaque:9")
 request.Input.Map["spec"]=resourcev2.Value{Kind:"map",Map:map[string]resourcev2.Value{"exact":{Kind:"int64",Int:"9223372036854775807"}}}
 backend.PrependReactor("update","pods",func(action clienttesting.Action)(bool,runtime.Object,error){
  object:=action.(clienttesting.UpdateAction).GetObject().(*unstructured.Unstructured)
  require.Equal(t,"native-name",object.GetName());require.Equal(t,"selected",action.GetNamespace())
  require.Equal(t,"uid-1",string(object.GetUID()));require.Equal(t,"opaque:9",object.GetResourceVersion())
  exact,found,err:=unstructured.NestedInt64(object.Object,"spec","exact");require.NoError(t,err);require.True(t,found);require.Equal(t,int64(9223372036854775807),exact)
  return false,nil,nil
 })
 record,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"update"},request,boundaryRepresentation());require.NoError(t,err)
 require.Equal(t,"9223372036854775807",record.Body.Map["spec"].Map["exact"].Int)
 for _,field:=range []string{"uid","resourceVersion"}{
  t.Run(field,func(t *testing.T){backend:=boundaryClient();r:=boundaryMutation(t,"update");r.Reference.Incarnation=mutationToken("uid-1");r.ExpectedRevision=mutationToken("opaque:9");r.Input.Map["metadata"].Map[field]=resourcev2.Value{Kind:"string",String:"wrong"};_,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"update"},r,boundaryRepresentation());require.Equal(t,"INVALID_REQUEST",resourcev2.ErrorCode(err));require.Empty(t,backend.Actions())})
 }
}

func TestNativeMutationDeleteReturnsOldBodyAndNativePreconditions(t *testing.T){
 object:=boundaryObject("native-name","selected");object.Object["spec"]=map[string]any{"exact":int64(9007199254740993)}
 backend:=boundaryClient(object)
 request:=boundaryMutation(t,"delete");request.Input=resourcev2.Value{Kind:"null"};request.Reference.Incarnation=mutationToken("uid-1");request.ExpectedRevision=mutationToken("opaque:9")
 backend.PrependReactor("delete","pods",func(action clienttesting.Action)(bool,runtime.Object,error){
  options:=action.(interface{GetDeleteOptions()metav1.DeleteOptions}).GetDeleteOptions()
  require.NotNil(t,options.Preconditions);require.Equal(t,"uid-1",string(*options.Preconditions.UID));require.Equal(t,"opaque:9",*options.Preconditions.ResourceVersion)
  require.Equal(t,"native-name",action.(clienttesting.DeleteAction).GetName());require.Equal(t,"selected",action.GetNamespace())
  return false,nil,nil
 })
 record,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"delete"},request,boundaryRepresentation());require.NoError(t,err)
 require.Equal(t,"9007199254740993",record.Body.Map["spec"].Map["exact"].Int)
 _,err=backend.Resource(boundaryGVR).Namespace("selected").Get(context.Background(),"native-name",metav1.GetOptions{});require.Error(t,err)
 for _,test:=range []struct{name,code string;uid,revision *string}{{"replacement","RESET_REQUIRED",mutationToken("other"),nil},{"revision","CONFLICT",nil,mutationToken("other")}}{
  t.Run(test.name,func(t *testing.T){backend:=boundaryClient(object);r:=boundaryMutation(t,"delete");r.Reference.Incarnation=test.uid;r.ExpectedRevision=test.revision;_,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"delete"},r,boundaryRepresentation());require.Equal(t,test.code,resourcev2.ErrorCode(err));require.Len(t,backend.Actions(),1);require.Equal(t,"get",backend.Actions()[0].GetVerb())})
 }
}

func TestNativeMutationRejectsUint64WithoutRoundingAndCancellation(t *testing.T){
 for _,number:=range []string{"9007199254740993","18446744073709551615"}{
  backend:=boundaryClient();r:=boundaryMutation(t,"create");r.Input.Map["number"]=resourcev2.Value{Kind:"uint64",Uint:number}
  _,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"create"},r,boundaryRepresentation());require.Equal(t,"UNSUPPORTED",resourcev2.ErrorCode(err));require.Empty(t,backend.Actions())
 }
 for _,verb:=range []string{"create","update","delete"}{
  backend:=boundaryClient();ctx,cancel:=context.WithCancel(context.Background());cancel()
  _,err:=NativeMutate(ctx,backend,boundaryGVR,true,[]string{verb},boundaryMutation(t,verb),boundaryRepresentation());require.True(t,errors.Is(err,context.Canceled));require.Empty(t,backend.Actions())
 }
}

func TestNativeMutationDeleteGraceIsExact(t *testing.T) {
 for _,seconds:=range []string{"0","9223372036854775807"} {
  t.Run(seconds,func(t *testing.T){
   backend:=boundaryClient(boundaryObject("native-name","selected"))
   request:=boundaryMutation(t,"delete")
   request.Input=resourcev2.Value{Kind:"map",Map:map[string]resourcev2.Value{"gracePeriodSeconds":{Kind:"int64",Int:seconds}}}
   backend.PrependReactor("delete","pods",func(action clienttesting.Action)(bool,runtime.Object,error){
    options:=action.(interface{GetDeleteOptions()metav1.DeleteOptions}).GetDeleteOptions()
    require.NotNil(t,options.GracePeriodSeconds)
    if seconds=="0"{require.Equal(t,int64(0),*options.GracePeriodSeconds)}else{require.Equal(t,int64(9223372036854775807),*options.GracePeriodSeconds)}
    return false,nil,nil
   })
   _,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"delete"},request,boundaryRepresentation())
   require.NoError(t,err)
  })
 }
 for _,value:=range []resourcev2.Value{{Kind:"int64",Int:"-1"},{Kind:"uint64",Uint:"18446744073709551615"},{Kind:"double",Double:1.5}} {
  backend:=boundaryClient()
  request:=boundaryMutation(t,"delete")
  request.Input=resourcev2.Value{Kind:"map",Map:map[string]resourcev2.Value{"gracePeriodSeconds":value}}
  _,err:=NativeMutate(context.Background(),backend,boundaryGVR,true,[]string{"delete"},request,boundaryRepresentation())
  require.Error(t,err)
  require.Empty(t,backend.Actions())
 }
}

func TestNativeMutationClusterScopeHasNoNamespace(t *testing.T) {
 backend:=boundaryClient()
 request:=boundaryMutation(t,"create")
 request.Reference.Address.Scope=[]resourcev2.ScopeEntry{}
 delete(request.Input.Map["metadata"].Map,"namespace")
 record,err:=NativeMutate(context.Background(),backend,boundaryGVR,false,[]string{"create"},request,boundaryRepresentation())
 require.NoError(t,err)
 require.Empty(t,record.Reference.Address.Scope)
 require.Empty(t,backend.Actions()[0].GetNamespace())
 backend=boundaryClient()
 request=boundaryMutation(t,"create")
 _,err=NativeMutate(context.Background(),backend,boundaryGVR,false,[]string{"create"},request,boundaryRepresentation())
 require.Equal(t,"INVALID_REQUEST",resourcev2.ErrorCode(err))
 require.Empty(t,backend.Actions())
}
