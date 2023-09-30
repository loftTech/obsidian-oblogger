## about

**oblogger is still in beta and will update frequently!**

oblogger is a side-panel plugin for Obsidian which focuses on two primary core features:
1. a **tag explorer** panel that lets you choose the tag groups you want to display as well as some pre-defined groups such as dailies, recent documents, files, and all of your untagged documents (these pre-defined groups can be hidden)
2. a helpful modal for **logging** information to a new document's frontmatter

<p align="center">
    <img width="500" alt="side panel preview" src="https://github.com/loftTech/obsidian-oblogger/assets/69363905/2b62b8cf-3579-498a-b3ef-19938c6eb362">
</p>
<p align="center">
    <img width="500" alt="logger" src="https://github.com/loftTech/obsidian-oblogger/assets/69363905/f4562622-e843-44b9-a2f9-c65356e11379">
</p>

## features

- tag explorer
  - custom note icons using frontmatter
  - support for obsidian bookmarks
    - bookmarked notes/files will be denoted with a bookmark icon
    - bookmarked notes/files will appear at the top of their respectve group 
  - **recent** list
    - status indicator reveals notes that haven't been tagged in any way
    - can cycle between 5, 10, and 15 recents in list
  - non-md **file list**
    - organized automatically regardless of folder
    - different sort groups
  - **daily notes** section for sorting notes tagged "#daily" by year/month/day
    - "#daily" can be changed to any tag you'd like to assoicate with daily notes
  - **untagged note list**
  - **custom tag groups** let you add any of your tags as a group
    - supports tag nesting 
    - supports multiple tags per file and multiple files per tag
    - supports tags in body and frontmatter
  - use a photo as an **avatar** to add some personality to the side panel
    - default avatar will show first letter of vault  
- **logger modal**
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
  - multi-select
  - expanded frontmatter editing

## faq

- why can't I rename notes/files from the side panel?
  - because it's hard :(. if you figure out how to link into the FileExplorer core plugin in a clean way, please let us know!
- why can't I log to the root vault folder?
  - because you didn't eat your vegetables
- how do I remove the avatar picture?
  - you have to go to your data.json for oblogger and remove the `avatarPath` setting. sowwy :( (feature incoming)
- can I at least **hide** my avatar?
  - yup! click on the nav bar gear. you can hide all sorts of stuff.
- how do i set a custom document icon?
  - add `icon: "..."` to a file's frontmatter. the `...` can be almost anything from https://lucide.dev eg: try adding `icon: "dog"` to a file :)
- I created a daily for yesterday and now my dailies are out of order?
  - by default, we use the `file.ctime` to sort the dailies. However, you can override the date by adding either `created: YYYY-MM-DD` or `day: YYYY-MM-DD` to the frontmatter.
- how can I give you guys money for all your hard work?
  - thank you so much! see [buy me a coffee](#buy-me-a-coffee)

## how to build

`npm run dev` for debug and watching

`npm run build` for release

## acknowledgements

we want to thank the [obsidian plugin-dev discord server](https://discordapp.com/channels/686053708261228577/840286264964022302) for all the help they gave us when we felt stuck. if you're reading this and working on a theme, plugin, or just want to engage more with the obsidian community, do yourself a favor and [join that discord channel](https://discord.gg/obsidianmd).

## buy me a coffee

<a href="https://www.buymeacoffee.com/lofttech" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="41" width="174"></a>
