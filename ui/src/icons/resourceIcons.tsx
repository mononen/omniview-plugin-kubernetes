import type { ResourceIconProps, ResourceIconSetV1 } from '@omniviewdev/runtime';
import type { ComponentType } from 'react';

import clusterRoleIcon from './kubernetes/c-role.svg?raw';
import configMapIcon from './kubernetes/cm.svg?raw';
import clusterRoleBindingIcon from './kubernetes/crb.svg?raw';
import customResourceDefinitionIcon from './kubernetes/crd.svg?raw';
import cronJobIcon from './kubernetes/cronjob.svg?raw';
import deploymentIcon from './kubernetes/deploy.svg?raw';
import daemonSetIcon from './kubernetes/ds.svg?raw';
import endpointsIcon from './kubernetes/ep.svg?raw';
import horizontalPodAutoscalerIcon from './kubernetes/hpa.svg?raw';
import ingressIcon from './kubernetes/ing.svg?raw';
import jobIcon from './kubernetes/job.svg?raw';
import limitRangeIcon from './kubernetes/limits.svg?raw';
import networkPolicyIcon from './kubernetes/netpol.svg?raw';
import nodeIcon from './kubernetes/node.svg?raw';
import namespaceIcon from './kubernetes/ns.svg?raw';
import podIcon from './kubernetes/pod.svg?raw';
import podSecurityPolicyIcon from './kubernetes/psp.svg?raw';
import persistentVolumeIcon from './kubernetes/pv.svg?raw';
import persistentVolumeClaimIcon from './kubernetes/pvc.svg?raw';
import resourceQuotaIcon from './kubernetes/quota.svg?raw';
import roleBindingIcon from './kubernetes/rb.svg?raw';
import roleIcon from './kubernetes/role.svg?raw';
import replicaSetIcon from './kubernetes/rs.svg?raw';
import serviceAccountIcon from './kubernetes/sa.svg?raw';
import storageClassIcon from './kubernetes/sc.svg?raw';
import secretIcon from './kubernetes/secret.svg?raw';
import statefulSetIcon from './kubernetes/sts.svg?raw';
import serviceIcon from './kubernetes/svc.svg?raw';

function nativeIcon(source: string): ComponentType<ResourceIconProps> {
  // Only sanitized, repository-owned SVGs enter this path. Never accept runtime markup.
  const [, viewBox, body] = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="([^"]+)">([\s\S]*)<\/svg>\s*$/.exec(source)!;
  const markup = { __html: body };
  return function NativeResourceIcon({ size = 16, className, 'aria-hidden': hidden = true }) {
    return <svg width={size} height={size} viewBox={viewBox} fill="currentColor" className={className} aria-hidden={hidden} focusable="false" style={{ width: size, height: size, flexShrink: 0 }} dangerouslySetInnerHTML={markup} />;
  };
}

const icons: Record<string, ComponentType<ResourceIconProps>> = {
  'k8s:/nodes': nativeIcon(nodeIcon),
  'k8s:/pods': nativeIcon(podIcon),
  'k8s:/configmaps': nativeIcon(configMapIcon),
  'k8s:/secrets': nativeIcon(secretIcon),
  'k8s:/namespaces': nativeIcon(namespaceIcon),
  'k8s:/services': nativeIcon(serviceIcon),
  'k8s:/endpoints': nativeIcon(endpointsIcon),
  'k8s:/persistentvolumes': nativeIcon(persistentVolumeIcon),
  'k8s:/persistentvolumeclaims': nativeIcon(persistentVolumeClaimIcon),
  'k8s:/resourcequotas': nativeIcon(resourceQuotaIcon),
  'k8s:/limitranges': nativeIcon(limitRangeIcon),
  'k8s:/serviceaccounts': nativeIcon(serviceAccountIcon),
  'k8s:apps/deployments': nativeIcon(deploymentIcon),
  'k8s:apps/daemonsets': nativeIcon(daemonSetIcon),
  'k8s:apps/replicasets': nativeIcon(replicaSetIcon),
  'k8s:apps/statefulsets': nativeIcon(statefulSetIcon),
  'k8s:batch/jobs': nativeIcon(jobIcon),
  'k8s:batch/cronjobs': nativeIcon(cronJobIcon),
  'k8s:autoscaling/horizontalpodautoscalers': nativeIcon(horizontalPodAutoscalerIcon),
  'k8s:networking.k8s.io/ingresses': nativeIcon(ingressIcon),
  'k8s:networking.k8s.io/networkpolicies': nativeIcon(networkPolicyIcon),
  'k8s:rbac.authorization.k8s.io/roles': nativeIcon(roleIcon),
  'k8s:rbac.authorization.k8s.io/clusterroles': nativeIcon(clusterRoleIcon),
  'k8s:rbac.authorization.k8s.io/rolebindings': nativeIcon(roleBindingIcon),
  'k8s:rbac.authorization.k8s.io/clusterrolebindings': nativeIcon(clusterRoleBindingIcon),
  'k8s:storage.k8s.io/storageclasses': nativeIcon(storageClassIcon),
  'k8s:apiextensions.k8s.io/customresourcedefinitions': nativeIcon(customResourceDefinitionIcon),
  'k8s:policy/podsecuritypolicies': nativeIcon(podSecurityPolicyIcon),
};

/** Native logical Types select trusted artwork without parsing generic identity. */
export const kubernetesResourceIconSet: ResourceIconSetV1 = {
  schemaVersion: 1,
  resolve(resourceType) {
    return icons[resourceType];
  },
};

