import { parse, stringify } from 'yaml';

export interface NativeTemplateIdentity {
  apiVersion: string;
  kind: string;
  namespaced: boolean;
}

/** Read only the selected native schema root; opaque resource Types carry no GVK. */
export function templateIdentity(document: unknown, root: string | undefined, namespaced: boolean): NativeTemplateIdentity | undefined {
  let selected = document;
  if (root && root !== '#') {
    if (!root.startsWith('#/')) return undefined;
    for (const segment of root.slice(2).split('/')) {
      if (!selected || typeof selected !== 'object') return undefined;
      selected = (selected as Record<string, unknown>)[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
  }
  if (!selected || typeof selected !== 'object') return undefined;
  const entries = (selected as Record<string, unknown>)['x-kubernetes-group-version-kind'];
  if (!Array.isArray(entries) || entries.length !== 1) return undefined;
  const entry = entries[0] as Record<string, unknown>;
  if (typeof entry.group !== 'string' || typeof entry.version !== 'string' || !entry.version ||
      typeof entry.kind !== 'string' || !entry.kind) return undefined;
  return { apiVersion: entry.group ? `${entry.group}/${entry.version}` : entry.version, kind: entry.kind, namespaced };
}

/**
 * Hand-crafted YAML templates for common Kubernetes resource kinds.
 */
const templates: Record<string, string> = {
  Pod: `apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  namespace: default
  labels:
    app: my-pod
spec:
  containers:
    - name: main
      image: nginx:latest
      ports:
        - containerPort: 80
`,

  Deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
  namespace: default
  labels:
    app: my-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-deployment
  template:
    metadata:
      labels:
        app: my-deployment
    spec:
      containers:
        - name: main
          image: nginx:latest
          ports:
            - containerPort: 80
`,

  StatefulSet: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-statefulset
  namespace: default
  labels:
    app: my-statefulset
spec:
  serviceName: my-statefulset
  replicas: 1
  selector:
    matchLabels:
      app: my-statefulset
  template:
    metadata:
      labels:
        app: my-statefulset
    spec:
      containers:
        - name: main
          image: nginx:latest
          ports:
            - containerPort: 80
`,

  DaemonSet: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-daemonset
  namespace: default
  labels:
    app: my-daemonset
spec:
  selector:
    matchLabels:
      app: my-daemonset
  template:
    metadata:
      labels:
        app: my-daemonset
    spec:
      containers:
        - name: main
          image: nginx:latest
`,

  Service: `apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
  type: ClusterIP
`,

  ConfigMap: `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-configmap
  namespace: default
data:
  key: value
`,

  Secret: `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
stringData:
  key: value
`,

  Namespace: `apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
`,

  PersistentVolumeClaim: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
`,

  ServiceAccount: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  namespace: default
`,

  Job: `apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: job
          image: busybox:latest
          command: ["echo", "Hello"]
      restartPolicy: Never
  backoffLimit: 4
`,

  CronJob: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
  namespace: default
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: job
              image: busybox:latest
              command: ["echo", "Hello"]
          restartPolicy: Never
`,

  Ingress: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
`,

  NetworkPolicy: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: allowed
      ports:
        - port: 80
          protocol: TCP
`,

  Role: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-role
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
`,

  ClusterRole: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: my-cluster-role
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
`,

  RoleBinding: `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-role-binding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: my-service-account
    namespace: default
roleRef:
  kind: Role
  name: my-role
  apiGroup: rbac.authorization.k8s.io
`,

  ClusterRoleBinding: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: my-cluster-role-binding
subjects:
  - kind: ServiceAccount
    name: my-service-account
    namespace: default
roleRef:
  kind: ClusterRole
  name: my-cluster-role
  apiGroup: rbac.authorization.k8s.io
`,

  StorageClass: `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: my-storage-class
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
`,
};

/** Keep useful native examples, but take identity and namespace admission from the selected schema and catalog. */
export const getTemplate = (identity?: NativeTemplateIdentity): string => {
  if (!identity) return '# Paste a complete Kubernetes YAML manifest, including apiVersion, kind, and metadata.name.\n';
  const { apiVersion, kind, namespaced } = identity;
  const example = templates[kind];
  const body = example ? parse(example) as Record<string, unknown> : {};
  body.apiVersion = apiVersion;
  body.kind = kind;
  const metadata = (body.metadata ?? { name: `my-${kind.toLowerCase()}` }) as Record<string, unknown>;
  if (namespaced) metadata.namespace = 'default';
  else delete metadata.namespace;
  body.metadata = metadata;
  return stringify(body);
};
