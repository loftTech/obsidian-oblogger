## about

oblogger is a plugin for Obsidian which focuses on two primary core features:
1. a **tag explorer** panel that lets you choose the tag groups you want to display as well as some pre-defined groups such as entries, recent documents, files, and all of your untagged documents (these pre-defined groups can be hidden)
2. a helpful modal for **logging** information to a new document's frontmatter

<p align="center">
    <img width="500" alt="side panel preview" src="https://github.com/loftTech/oblogger/assets/1900880/a1bc1817-d2c0-431d-be0f-575bcaf51e57">
</p>
<p align="center">
    <img width="364" alt="logger" src="https://github.com/loftTech/oblogger/assets/1900880/1598da1b-20a0-4eb7-93b6-498abdf5310d">
</p>

## features

- tag explorer
  - custom document icons
  - recent document list with untagged notifier
  - non-md files 
    - organized automatically regardless of folder
    - different sort groups
  - avatar for adding some personality to the side panel
  - choose a tag to associate with your daily note and the side panel will automatically organize all of your dailies by year and month
  - list for untagged documents
  - custom tag group viewer
    - supports tag nesting
    - supports multiple tags per file and multiple files per tag
    - supports tags in body and frontmatter
- logger modal
  - custom logging path (does not support logging to root of vault)
  - easy frontmatter generation
    - add new fields
    - suggester popup based on previously logged data

## roadmap

- version 2.0 and beyond
  - "scheduled" logging
  - "session" logging
  - continuous logging
  - rich editor functionality in logger body field
  - sorting and pinning tag groups
  - renaming files from side panel
  - control/command click to new tab
  - multi-select
  - expanded frontmatter editing

## faq

- why can't I rename files from the side panel?
  - because it's hard :(. if you figure out how to link into the FileExplorer core plugin in a clean way, please let us know!
- why can't I log to the root vault folder?
  - because you didn't eat your vegetables
- how do I remove the avatar picture?
  - you have to go to your data.json for oblogger and remove the `avatarPath` setting. sowwy :( (feature incoming)
- can I at least **hide** my avatar?
  - yup! click on the nav bar gear. you can hide all sorts of stuff.
- how do i set a custom document icon?
  - add `icon: "..."` to a file's frontmatter. the `...` can be almost anything from https://lucide.dev. eg: try adding `icon: "dog"` to a file :)
- I created an entry for yesterday and now my entries are out of order?
  - by default, we use the `file.ctime` to sort the entries. However, you can override the date by adding either `created: YYYY-MM-DD` or `day: YYYY-MM-DD` to the frontmatter.
- how can I give you guys money for all your hard work?
  - thank you so much! see [buy me a coffee](#buy-me-a-coffee)

## how to build

`npm run dev` for debug and watching

`npm run build` for release

## buy me a coffee:

<a href="https://www.buymeacoffee.com/lofttech" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="41" width="174"></a>
