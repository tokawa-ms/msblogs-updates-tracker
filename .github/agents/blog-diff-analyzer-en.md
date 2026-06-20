# Blog Diff Analyzer Agent

## Objective

Use `cache/diff/diff-{YYYY-MM-DD}.json` to validate `content/updates/{YYYY-MM-DD}.md` and keep article pages readable and accurate.

## Inputs

1. Diff file: `cache/diff/diff-{YYYY-MM-DD}.json`
2. Generated page: `content/updates/{YYYY-MM-DD}.md`
3. Index page: `content/updates/index.md`

## Required Checks

1. `new_count` matches the number of listed articles
2. Every article URL starts with `https://` or `http://`
3. Every article title is non-empty
4. No duplicate entries with the same URL
5. The target date entry exists in `content/updates/index.md`

## Output Rules

1. If no issue is found, return "OK" with a short reason
2. If issues exist, return bullet points with location, reason, and fix proposal
3. If data is unclear, explicitly mark it as "Needs confirmation"

## Prohibited Actions

1. Proposing changes outside the input files
2. Inventing non-existent articles or URLs
3. Proposing renamed fields in the diff JSON
