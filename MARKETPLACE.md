<h1 align="center">
  <br />
  Kubernetes for Omniview
  <br />
</h1>

<p align="center">
  <strong>Everything you need to operate Kubernetes clusters, built natively into Omniview.</strong>
</p>

---

## Real-Time Resource Explorer

Browse every resource in your cluster across **70+ resource types** — from Pods and Deployments to CRDs and RBAC policies. Tables update live as your cluster changes, powered by Kubernetes informers with zero polling.

- **Search and filter** instantly across any column
- **Namespace scoping** to focus on what matters
- **Dynamic columns** — promote any label or annotation into a sortable column
- **Persistent preferences** — column visibility, widths, and filters are remembered per resource

## Detailed Resource Sidebars

Click any resource to open a rich detail panel with everything you need at a glance.

- **Pods** — container statuses, ports, volumes, environment variables, resource requests/limits, probes, and live metric graphs
- **Deployments, StatefulSets, DaemonSets** — replica counts, rollout progress, and selector details
- **Services & Ingresses** — port mappings, endpoint resolution, host/path rule tables
- **Jobs & CronJobs** — completion status, schedules, parallelism
- **Nodes** — system info, capacity, conditions, images, topology, and node-level metrics
- **ConfigMaps & Secrets** — key-value viewer
- **PVs & PVCs** — binding status, storage class, access modes

Every sidebar includes a **YAML editor** with diff view and schema validation for quick edits.

## Integrated Terminal

Open a shell in any running container directly from the UI. The plugin handles multi-container pods, intelligently detects available shells, and even supports exec into distroless images via debug containers. Need node-level access? Shell into nodes with ephemeral debug pods.

## Log Streaming

Tail container logs in real time with follow mode, or inspect historical logs with time-based and line-count filters. Supports init containers, sidecars, ephemeral containers, and previous container logs for crash investigation.

## Port Forwarding

Forward any pod port to your local machine in one click. Configure local and remote ports, manage active connections, and clean up automatically on disconnect.

## Helm Management

A complete Helm workflow without switching tools:

- **Browse charts** from your configured repositories
- **Install releases** with a full YAML values editor and dry-run preview
- **Manage releases** — view status, revision history, and chart versions
- **Upgrade releases** to new versions with value overrides
- **Repository management** — add, remove, and refresh chart repos

## Create Resources

Create new resources directly from the toolbar. Click **Create**, edit the pre-populated YAML template in a full Monaco editor, and submit. Templates are provided for 19 common resource kinds including Deployments, Services, ConfigMaps, Jobs, Ingresses, RBAC resources, and more.

## Cluster Dashboard

Get an at-a-glance view of cluster health:

- **Resource gauges** for CPU, memory, and pod utilization
- **Workload summary** with running, pending, and failed pod counts
- **Live metrics** over time for CPU, memory, network, and disk
- **Event feed** with real-time cluster events
- **CIS benchmark scoring** for security compliance

## Metrics

Integrates with **metrics-server** for basic CPU and memory data, and optionally with **Prometheus** for deep time-series metrics including CPU throttle rates, memory working set, network I/O, disk throughput, OOM kills, restart counts, and more. Metrics appear as interactive graphs in the dashboard, node sidebars, and pod sidebars.

## Multi-Cluster Support

Connect to as many clusters as you need. Each cluster gets its own connection with independent namespace filters, display preferences, and resource views. Switch between clusters instantly from the sidebar.

## Custom Resource Definitions

CRDs are discovered automatically and rendered with the same table and sidebar experience as built-in resources. No configuration required — if it exists in your cluster, you can browse and manage it.

---

<p align="center">
  <a href="https://omniview.dev">omniview.dev</a>
</p>
