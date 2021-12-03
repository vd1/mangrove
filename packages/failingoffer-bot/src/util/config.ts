import dotenvFlow from "dotenv-flow";
dotenvFlow.config();
if (!process.env["NODE_CONFIG_DIR"]) {
  process.env["NODE_CONFIG_DIR"] = __dirname + "/../../config/";
}
import config from "config";

export default config;
export { config };

// The following helpers are also prime candidates for a commonlib
type ConfigError = {
  readonly _tag: "ConfigError";
  readonly errorMessage: string;
};

type FoundConfigValue<ConfigType> = {
  readonly _tag: "FoundConfigValue";
  readonly value: ConfigType;
};

export type ConfigValue<ConfigType> =
  | FoundConfigValue<ConfigType>
  | ConfigError;

export function getConfigValue<ConfigType>(
  configName: string
): ConfigValue<ConfigType> {
  if (config.has(configName)) {
    return {
      _tag: "FoundConfigValue",
      value: config.get<ConfigType>(configName),
    };
  } else {
    return {
      _tag: "ConfigError",
      errorMessage: `Config value ${configName} missing`,
    };
  }
}
