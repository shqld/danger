import { Env, CISource } from "../ci_source/ci_source"
import { GitJSONDSL, GitDSL } from "../dsl/GitDSL"
import { GitHub } from "./GitHub"
import { GitHubAPI } from "./github/GitHubAPI"
import { DangerResults } from "../dsl/DangerResults"

/** A type that represents the downloaded metadata about a code review session */
export type Metadata = any

/** A type that represents a comment */
export type Comment = {
  /**
   *  UUID for the comment
   *
   * @type {string}
   */
  id: string
  /**
   * Textual representation of comment
   *
   * @type {string} body string
   */
  body: string
  /**
   * Was this posted by the account Danger has access to?
   *
   * @type {boolean} true if Danger can edit
   */
  ownedByDanger: boolean
}

export interface Platform extends PlatformCommunicator {
  /** Mainly for logging and error reporting */
  readonly name: string

  getReviewInfo: () => Promise<any>
  /** Pulls in the platform specific metadata for inspection */
  getPlatformDSLRepresentation: () => Promise<any>
  /** Pulls in the Code Review Diff, and offers a succinct user-API for it */
  getPlatformGitRepresentation: () => Promise<GitJSONDSL>
  /** Get the contents of a file at a path */
  getFileContents: (path: string, slug?: string, ref?: string) => Promise<string>
}

// This is basically the commenting aspect of a platform, which allow us to
// separate out the comment handling vs the DSL generation for a platform
export interface PlatformCommunicator {
  /** Basically, should a chance for async platform side-effects before passing the results into the comment section of danger issue create/update/deleter */
  platformResultsPreMapper?: (results: DangerResults) => Promise<DangerResults>
  /** Can it update comments? */
  supportsCommenting: () => boolean
  /** Does the platform support inline comments? */
  supportsInlineComments: () => boolean
  /** Allows the platform to do whatever it wants, instead of using the default commenting system  */
  handlePostingResults?: (results: DangerResults) => void
  /** Gets inline comments for current PR */
  getInlineComments: (dangerID: string) => Promise<Comment[]>
  /** Creates a comment on the PR */
  createComment: (dangerID: string, body: string) => Promise<any>
  /** Creates an inline comment on the PR if possible */
  createInlineComment: (git: GitDSL, comment: string, path: string, line: number) => Promise<any>
  /** Updates an inline comment */
  updateInlineComment: (comment: string, commentId: string) => Promise<any>
  /** Delete an inline comment */
  deleteInlineComment: (commentId: string) => Promise<boolean>
  /** Delete the main Danger comment */
  deleteMainComment: (dangerID: string) => Promise<boolean>
  /** Replace the main Danger comment, returning the URL to the issue */
  updateOrCreateComment: (dangerID: string, newComment: string) => Promise<string | undefined>
  /** Sets the current PR's status */
  updateStatus: (passed: boolean | "pending", message: string, url?: string) => Promise<boolean>
}

/**
 * Pulls out a platform for Danger to communicate on based on the environment
 * @param {Env} env The environment.
 * @param {CISource} source The existing source, to ensure they can run against each other
 * @returns {Platform} returns a platform if it can be supported
 */
export function getPlatformForEnv(env: Env, source: CISource, requireAuth = true): Platform {
  // GitHub
  const ghToken = env["DANGER_GITHUB_API_TOKEN"]
  if (ghToken || !requireAuth) {
    if (!ghToken) {
      console.log("You don't have a DANGER_GITHUB_API_TOKEN set up, this is optional, but TBH, you want to do this")
      console.log("Check out: http://danger.systems/js/guides/the_dangerfile.html#working-on-your-dangerfile")
    }

    const api = new GitHubAPI(source, ghToken)
    const github = GitHub(api)
    return github
  }

  console.error("The DANGER_GITHUB_API_TOKEN/DANGER_BITBUCKETSERVER_HOST environmental variable is missing")
  console.error("Without an api token, danger will be unable to comment on a PR")
  throw new Error("Cannot use authenticated API requests.")
}
