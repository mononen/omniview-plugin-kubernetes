package resource

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"


	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/omniview/kubernetes/pkg/utils/kubeauth"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	"github.com/omniviewdev/plugin-sdk/pkg/types"
	"github.com/omniviewdev/plugin-sdk/pkg/utils"
)

const (
	// Estimated size of a the number of contexts in a kubeconfig.
	EstimatedContexts = 10
)

// enrichConnectionData populates conn.Data with cluster metadata discovered on
// successful connection. This data is persisted by the backend controller and
// available to the UI even when the cluster is not currently connected.
func enrichConnectionData(
	ctx context.Context,
	conn *types.Connection,
	client *clients.ClientSet,
	groups *metav1.APIGroupList,
) {
	if conn.Data == nil {
		conn.Data = make(map[string]interface{})
	}

	// Server URL from the resolved REST config
	if client.RESTConfig != nil && client.RESTConfig.Host != "" {
		conn.Data["server_url"] = client.RESTConfig.Host
	}

	// API group count from already-fetched ServerGroups
	if groups != nil {
		conn.Data["api_groups"] = len(groups.Groups)
	}

	// Diagnostic enrichment shares the invocation deadline and never survives
	// connection teardown. Each native list page remains bounded.
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if data, err := client.DiscoveryClient.RESTClient().Get().AbsPath("/version").DoRaw(ctx); err == nil {
		var info struct { GitVersion string `json:"gitVersion"`; Platform string `json:"platform"` }
		if json.Unmarshal(data, &info) == nil {
			conn.Data["k8s_version"] = info.GitVersion
			conn.Data["k8s_platform"] = info.Platform
		}
	}
	delete(conn.Data, "node_count")
	count, continuation := 0, ""
	for {
		page, err := client.KubeClient.CoreV1().Nodes().List(ctx, metav1.ListOptions{Limit: 256, Continue: continuation})
		if err != nil { break }
		count += len(page.Items)
		continuation = page.Continue
		if continuation == "" { conn.Data["node_count"] = count; break }
	}

	conn.Data["last_checked"] = time.Now().UTC().Format(time.RFC3339)
}

func connectionsFromKubeconfig(kubeconfigPath string) ([]types.Connection, error) {
	// if the path has a ~ in it, expand it to the home directory
	kubeconfigPath, err := utils.ExpandTilde(kubeconfigPath)
	if err != nil {
		return nil, err
	}

	// Load the kubeconfig file to get the configuration.
	config, err := clientcmd.LoadFromFile(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig from path %s: %w", kubeconfigPath, err)
	}

	connections := make([]types.Connection, 0, len(config.Contexts))

	for contextName, context := range config.Contexts {
		labels := map[string]interface{}{
			"kubeconfig": utils.DeexpandTilde(kubeconfigPath),
			"cluster":    context.Cluster,
			"user":       context.AuthInfo,
		}
		enrichConnectionLabels(labels, config, context)

		connections = append(connections, types.Connection{
			ID:          contextName,
			Name:        contextName,
			Description: "",
			Avatar:      "",
			Labels:      labels,
			Data: map[string]interface{}{
				"kubeconfig": kubeconfigPath,
				"cluster":    context.Cluster,
				"namespace":  context.Namespace,
				"user":       context.AuthInfo,
			},
		})
	}

	return connections, nil
}

// enrichConnectionLabels extracts cloud metadata from kubeconfig into connection labels
// so they can be used for dynamic grouping, filtering, and display in the frontend.
func enrichConnectionLabels(
	labels map[string]interface{},
	config *clientcmdapi.Config,
	context *clientcmdapi.Context,
) {
	if cluster := config.Clusters[context.Cluster]; cluster != nil {
		labels["server"] = cluster.Server
	}

	authInfo := config.AuthInfos[context.AuthInfo]
	if authInfo == nil || authInfo.Exec == nil {
		labels["auth_method"] = "default"
		return
	}

	switch {
	case kubeauth.IsEKSAuth(authInfo):
		labels["auth_method"] = "eks"
		enrichEKSLabels(labels, authInfo)
	case kubeauth.IsGCPAuth(authInfo):
		labels["auth_method"] = "gke"
		enrichGKELabels(labels, authInfo)
	case kubeauth.IsAKSAuth(authInfo):
		labels["auth_method"] = "aks"
		enrichAKSLabels(labels, authInfo)
	default:
		labels["auth_method"] = authInfo.Exec.Command
	}
}

// enrichEKSLabels extracts region, account, profile, and role from EKS auth config.
func enrichEKSLabels(labels map[string]interface{}, authInfo *clientcmdapi.AuthInfo) {
	var region, profile, roleArn string

	// Parse args for both aws CLI and aws-iam-authenticator
	for i := 0; i < len(authInfo.Exec.Args)-1; i++ {
		switch authInfo.Exec.Args[i] {
		case "--region":
			region = authInfo.Exec.Args[i+1]
		case "--role-arn", "--role", "-r":
			roleArn = authInfo.Exec.Args[i+1]
		}
	}

	// Parse env vars
	for _, entry := range authInfo.Exec.Env {
		switch entry.Name {
		case "AWS_PROFILE":
			profile = entry.Value
		case "AWS_REGION":
			if region == "" {
				region = entry.Value
			}
		case "AWS_DEFAULT_REGION":
			if region == "" {
				region = entry.Value
			}
		}
	}

	if region != "" {
		labels["region"] = region
	}
	if profile != "" {
		labels["profile"] = profile
	}
	if roleArn != "" {
		labels["role"] = roleArn
		// Extract account ID from ARN: arn:aws:iam::ACCOUNT_ID:...
		if parts := strings.SplitN(roleArn, ":", 6); len(parts) >= 5 {
			labels["account"] = parts[4]
		}
	}
}

// enrichGKELabels extracts project, zone/region from GKE gcloud exec config.
func enrichGKELabels(labels map[string]interface{}, authInfo *clientcmdapi.AuthInfo) {
	for i := 0; i < len(authInfo.Exec.Args)-1; i++ {
		switch authInfo.Exec.Args[i] {
		case "--project":
			labels["project"] = authInfo.Exec.Args[i+1]
		case "--zone":
			labels["zone"] = authInfo.Exec.Args[i+1]
		case "--region":
			labels["region"] = authInfo.Exec.Args[i+1]
		}
	}

	// Check env vars as fallback
	for _, entry := range authInfo.Exec.Env {
		if entry.Name == "CLOUDSDK_CORE_PROJECT" {
			if _, ok := labels["project"]; !ok {
				labels["project"] = entry.Value
			}
		}
	}
}

// enrichAKSLabels extracts subscription and resource group from Azure CLI exec config.
func enrichAKSLabels(labels map[string]interface{}, authInfo *clientcmdapi.AuthInfo) {
	for i := 0; i < len(authInfo.Exec.Args)-1; i++ {
		switch authInfo.Exec.Args[i] {
		case "--subscription":
			labels["subscription"] = authInfo.Exec.Args[i+1]
		case "--resource-group":
			labels["resource_group"] = authInfo.Exec.Args[i+1]
		}
	}
}

