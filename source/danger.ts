import { getCISourceForEnv } from "./ci_source/get_ci_source"
import { getPlatformForEnv } from "./platforms/platform"
import { jsonDSLGenerator } from "./runner/dslGenerator"

export async function init(env?: Object) {
  env = env || process.env

  const ciSource = await getCISourceForEnv(env)

  if (!ciSource) {
    throw new Error("Env passed to getCISourceForEnv seems incorrect")
  }

  const platform = await getPlatformForEnv(env, ciSource)

  const dsl = await jsonDSLGenerator(platform)

  return dsl
}
