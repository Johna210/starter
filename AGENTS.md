# AGENTS.md

## Workflow: feature branches, part-by-part commits, PR to master

Every piece of feature work follows this lifecycle. **Never commit feature
work directly to `master`** — even small, isolated tickets get a branch.
This is what keeps `master` releasable and the history reviewable.

1. **Branch first.** From a clean `master`, create a branch named
   `issue-XX-short-description` where `XX` is the **GitHub issue number**
   (e.g. `issue-06-web-auth-integration` for GitHub issue #8, whose spec
   title is "06 — Web-auth integration (TS-monolith)"). For non-issue
   work (refactors, chores), pick a kebab-case name that names the work,
   e.g. `refactor-split-materialize-27`. Push the branch upstream
   immediately so the work isn't stranded locally:
   `git push -u origin <branch>`.
2. **Work in parts.** Use the `/implement` skill to drive the work.
   When the work has natural vertical slices (e.g. the auth shim, the
   cookie+body routes, the api-client wrapper, the `/login` page, the
   protected `/items`), commit each slice **separately** on the branch
   using the `/git-commit` skill. Conventional commits; reference the
   issue in the subject or body (`Refs #8`, `Closes #8`).
3. **Verify before push.** Run the full test suite (`task test`) and the
   typecheck (`RUN_TYPE_CHECK=1 task test:cli`) before pushing the final
   slice. A green typecheck on the materialized project is the
   non-negotiable gate — the templates are the contract.
4. **Open the PR.** `gh pr create --base master --title "..." --body "..."`
   with a body that:
   - Links the issue (`Closes #8`)
   - Summarises the user-visible behavior that landed
   - Lists the slice-by-slice commits so the reviewer can read it
     bottom-up
5. **Close the issue** with a short comment summarising what landed
   (`gh issue close <n> --comment "..."`). Do this either at PR-open
   time (if the issue is fully addressed by the PR) or after merge
   (if you want the close to track the merged state).
6. **Merge to `master`.** Squash- or rebase-merge per repo preference;
   this repo squashes via the GitHub UI. Delete the branch on the
   remote after merge (`gh pr view --json headRefName` to confirm).

If a step in the lifecycle ever feels like the wrong default (e.g. a
hotfix that has to land on `master` immediately), surface it in the
PR body — don't silently skip the branch.

## Agent skills

### Issue tracker

GitHub Issues in this repo (`git@github.com:Johna210/starter.git`), accessed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.
