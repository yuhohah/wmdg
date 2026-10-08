# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `yuhohah/wmdg`.
Use the `gh` CLI from this repo.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body-file <file>`
- Label: `gh issue edit <number> --add-label "..." --remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Use a temporary file for multiline issue bodies and comments.
Infer the repository from the Git remote.

## Pull requests as a triage surface

PRs as a request surface: no.

## Skill operations

When instructed to publish to the issue tracker, create a GitHub issue.
When instructed to fetch a ticket, read the issue and its comments.

## Wayfinding

Use an issue labelled `wayfinder:map` as the map.
Link child tickets through GitHub sub-issues; otherwise use a task list
in the map and `Part of #<map>` in each child.

Label children `wayfinder:<type>`: research, prototype, grilling, or task.
Use native issue dependencies for blockers; if unavailable, record
`Blocked by: #<number>` in the child.

Select the first open, unassigned child in map order with no open blockers.
Claim it with `gh issue edit <number> --add-assignee @me`.
Resolve it by commenting, closing it, and adding a findings pointer
to the map's Decisions-so-far.
