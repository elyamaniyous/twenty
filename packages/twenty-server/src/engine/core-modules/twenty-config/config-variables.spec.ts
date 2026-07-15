import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ConfigVariables } from 'src/engine/core-modules/twenty-config/config-variables';
import { type ConfigVariablesMetadataMap } from 'src/engine/core-modules/twenty-config/decorators/config-variables-metadata.decorator';
import { ConfigVariableType } from 'src/engine/core-modules/twenty-config/enums/config-variable-type.enum';
import { ConfigVariablesGroup } from 'src/engine/core-modules/twenty-config/enums/config-variables-group.enum';
import { TypedReflect } from 'src/utils/typed-reflect';

describe('ERP Maroc config variables', () => {
  const getMetadata = (): ConfigVariablesMetadataMap =>
    TypedReflect.getMetadata('config-variables', ConfigVariables) ?? {};

  it('defines the exact ERP integration metadata without exposing public values as sensitive', () => {
    const metadata = getMetadata();

    expect(metadata.ERP_MAROC_ENABLED).toEqual({
      group: ConfigVariablesGroup.ADVANCED_SETTINGS,
      description: 'Enable the ERP Maroc integration',
      type: ConfigVariableType.BOOLEAN,
      isEnvOnly: true,
    });
    expect(metadata.ERP_API_URL).toEqual({
      group: ConfigVariablesGroup.ADVANCED_SETTINGS,
      description: 'Base URL of the ERP Maroc API',
      type: ConfigVariableType.STRING,
      isEnvOnly: true,
    });
    expect(metadata.ERP_INTERNAL_API_KEY).toEqual({
      group: ConfigVariablesGroup.ADVANCED_SETTINGS,
      description: 'Internal API key used to authenticate with ERP Maroc',
      type: ConfigVariableType.STRING,
      isEnvOnly: true,
      isSensitive: true,
    });
  });

  it('defaults the ERP integration to disabled', () => {
    expect(new ConfigVariables().ERP_MAROC_ENABLED).toBe(false);
  });

  it('does not validate ERP credentials while the integration is disabled', () => {
    const config = plainToClass(ConfigVariables, {
      ERP_MAROC_ENABLED: false,
      ERP_API_URL: 'not-a-url',
      ERP_INTERNAL_API_KEY: '',
    });

    const erpErrors = validateSync(config, { strictGroups: true }).filter(
      ({ property }) => property.startsWith('ERP_'),
    );

    expect(erpErrors).toEqual([]);
  });

  it('validates the ERP URL and key while the integration is enabled', () => {
    const config = plainToClass(ConfigVariables, {
      ERP_MAROC_ENABLED: true,
      ERP_API_URL: 'not-a-url',
      ERP_INTERNAL_API_KEY: '',
    });

    const erpErrorProperties = validateSync(config, {
      strictGroups: true,
    }).map(({ property }) => property);

    expect(erpErrorProperties).toEqual(
      expect.arrayContaining(['ERP_API_URL', 'ERP_INTERNAL_API_KEY']),
    );
  });

  it('rejects an omitted ERP URL and key while the integration is enabled', () => {
    const config = plainToClass(ConfigVariables, {
      ERP_MAROC_ENABLED: true,
    });

    const erpErrorProperties = validateSync(config, {
      strictGroups: true,
    }).map(({ property }) => property);

    expect(erpErrorProperties).toEqual(
      expect.arrayContaining(['ERP_API_URL', 'ERP_INTERNAL_API_KEY']),
    );
  });

  it('rejects an ERP internal API key containing only whitespace', () => {
    const config = plainToClass(ConfigVariables, {
      ERP_MAROC_ENABLED: true,
      ERP_API_URL: 'http://localhost:3000',
      ERP_INTERNAL_API_KEY: '   ',
    });

    const erpErrorProperties = validateSync(config, {
      strictGroups: true,
    }).map(({ property }) => property);

    expect(erpErrorProperties).toContain('ERP_INTERNAL_API_KEY');
  });
});
