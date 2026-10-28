import { Button, Dialog, Input, Stack, Text } from '@omniviewdev/base-ui';
import { useExecuteAction } from '@omniviewdev/runtime';
import React from 'react';
import { SiHelm } from 'react-icons/si';

import { PLUGIN_ID } from '@/pluginId';

import SimpleSelect from '../../connections/SimpleSelect';
import CodeEditor from '../../shared/CodeEditor';
import NamespaceSelect from '../../shared/NamespaceSelect';

const dialogStyle: React.CSSProperties = { width: '90%', maxWidth: 900, maxHeight: '90vh' };
const fieldLabelStyle: React.CSSProperties = { fontWeight: 500 };
const fieldFlexStyle: React.CSSProperties = { flex: 1 };
const versionFieldStyle: React.CSSProperties = { minWidth: 180 };
const fullWidthStyle: React.CSSProperties = { width: '100%' };
const valuesEditorStyle: React.CSSProperties = {
  height: 400,
  border: '1px solid var(--ov-color-border-default)',
  borderRadius: 4,
  overflow: 'hidden',
};
const dryRunEditorStyle: React.CSSProperties = {
  height: 350,
  border: '1px solid var(--ov-color-border-default)',
  borderRadius: 4,
  overflow: 'hidden',
};

interface Props {
  open: boolean;
  onClose: () => void;
  chartID: string;
  chartName: string;
  connectionID: string;
  initialVersion?: string;
}

/** Data returned by the `get-values` chart action. */
interface ChartValuesData {
  values?: string;
}

/** Data returned by the `get-versions` chart action. */
interface ChartVersionsData {
  versions?: Array<{ version: string; appVersion: string }>;
}

/** Data returned by the `dry-run-install` release action. */
interface DryRunInstallData {
  manifest?: string;
}

const InstallChartDialog: React.FC<Props> = ({
  open,
  onClose,
  chartID,
  chartName,
  connectionID,
  initialVersion,
}) => {
  const [releaseName, setReleaseName] = React.useState('');
  const [namespace, setNamespace] = React.useState('default');
  const [version, setVersion] = React.useState(initialVersion ?? '');
  const [values, setValues] = React.useState('');
  const [versions, setVersions] = React.useState<Array<{ version: string; appVersion: string }>>(
    [],
  );
  const [dryRunManifest, setDryRunManifest] = React.useState<string | null>(null);

  const { executeAction: executeChartAction, isExecuting: isChartExecuting } = useExecuteAction({
    pluginID: PLUGIN_ID,
    connectionID,
    resourceKey: 'helm::v1::Chart',
  });

  const { executeAction: executeReleaseAction, isExecuting: isReleaseExecuting } = useExecuteAction(
    {
      pluginID: PLUGIN_ID,
      connectionID,
      resourceKey: 'helm::v1::Release',
    },
  );

  const isExecuting = isChartExecuting || isReleaseExecuting;

  // Load default values and versions on open
  React.useEffect(() => {
    if (!open || !chartID) return;

    // Set initial version if provided
    if (initialVersion) {
      setVersion(initialVersion);
    }

    // Load default values
    void executeChartAction({
      actionID: 'get-values',
      id: chartID,
      params: initialVersion ? { version: initialVersion } : undefined,
    })
      .then((result) => {
        const valuesData = result?.data as ChartValuesData | undefined;
        setValues(valuesData?.values ?? '');
      })
      .catch(() => {});

    // Load versions
    void executeChartAction({
      actionID: 'get-versions',
      id: chartID,
    })
      .then((result) => {
        const versionsData = result?.data as ChartVersionsData | undefined;
        const versionList = versionsData?.versions ?? [];
        setVersions(versionList);
        if (versionList.length > 0 && !version && !initialVersion) {
          setVersion(versionList[0].version);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chartID]);

  const handleNamespaceChange = React.useCallback((ns: string) => {
    setNamespace(ns);
  }, []);

  const handleDryRun = async () => {
    try {
      const result = await executeReleaseAction({
        actionID: 'dry-run-install',
        id: '',
        namespace,
        params: {
          chart: chartID,
          name: releaseName,
          namespace,
          version,
        },
      });
      const dryRunData = result?.data as DryRunInstallData | undefined;
      setDryRunManifest(dryRunData?.manifest ?? 'No manifest generated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Dry run failed';
      setDryRunManifest(`Error: ${message}`);
    }
  };

  const handleInstall = async () => {
    try {
      await executeReleaseAction({
        actionID: 'install',
        id: '',
        namespace,
        params: {
          chart: chartID,
          name: releaseName,
          namespace,
          version,
        },
      });
      onClose();
    } catch {
      // Error handling is done by the runtime
    }
  };

  const handleClose = () => {
    setDryRunManifest(null);
    onClose();
  };

  const versionOptions = versions.map((v) => ({
    value: v.version,
    label: v.appVersion ? `${v.version} (App: ${v.appVersion})` : v.version,
  }));

  return (
    <Dialog open={open} onClose={handleClose} size="xl" style={dialogStyle}>
      {/* Header */}
      <Dialog.Title icon={<SiHelm size={16} />}>Install {chartName}</Dialog.Title>
      <Dialog.Close />

      {/* Content */}
      <Dialog.Body>
        <Stack direction="column" spacing={4}>
          {/* Form inputs */}
          <Stack direction="row" spacing={4}>
            <Stack direction="column" spacing={1} style={fieldFlexStyle}>
              <Text as="label" htmlFor="install-release-name" size="xs" tone="muted" style={fieldLabelStyle}>
                Release Name
              </Text>
              <Input.Control
                id="install-release-name"
                value={releaseName}
                onChange={(e) => setReleaseName(e.target.value)}
                placeholder="my-release"
                size="sm"
                style={fullWidthStyle}
                autoComplete="off"
              />
            </Stack>
            <Stack direction="column" spacing={1} style={fieldFlexStyle}>
              <Text size="xs" tone="muted" style={fieldLabelStyle}>
                Namespace
              </Text>
              <NamespaceSelect
                value={namespace}
                onChange={handleNamespaceChange}
                connectionID={connectionID}
                size="sm"
                placeholder="Select or create namespace"
              />
            </Stack>
            <Stack direction="column" spacing={1} style={versionFieldStyle}>
              <Text size="xs" tone="muted" style={fieldLabelStyle}>
                Version
              </Text>
              <SimpleSelect
                aria-label="Version"
                options={versionOptions}
                value={version}
                onChange={setVersion}
                size="sm"
                placeholder={versions.length === 0 ? 'Loading...' : undefined}
                disabled={versions.length === 0}
                style={fullWidthStyle}
              />
            </Stack>
          </Stack>

          {/* Values editor */}
          <Stack direction="column" spacing={1}>
            <Text size="xs" tone="muted" style={fieldLabelStyle}>
              Values (YAML)
            </Text>
            <div style={valuesEditorStyle}>
              <CodeEditor
                filename="values.yaml"
                language="yaml"
                value={values}
                onChange={(v) => setValues(v)}
                height={400}
              />
            </div>
          </Stack>

          {/* Dry run preview */}
          {dryRunManifest !== null && (
            <Stack direction="column" spacing={1}>
              <Text size="xs" tone="muted" style={fieldLabelStyle}>
                Dry Run Preview
              </Text>
              <div style={dryRunEditorStyle}>
                <CodeEditor
                  filename="manifest.yaml"
                  language="yaml"
                  value={dryRunManifest}
                  readOnly
                  height={350}
                />
              </div>
            </Stack>
          )}
        </Stack>
      </Dialog.Body>

      {/* Footer */}
      <Dialog.Footer>
        <Button size="xs" variant="ghost" color="neutral" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="xs"
          variant="outline"
          color="neutral"
          disabled={isExecuting || !releaseName}
          onClick={() => void handleDryRun()}
        >
          Dry Run
        </Button>
        <Button
          size="xs"
          variant="solid"
          color="brand"
          disabled={isExecuting || !releaseName || !namespace}
          onClick={() => void handleInstall()}
        >
          Install
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};

export default InstallChartDialog;
