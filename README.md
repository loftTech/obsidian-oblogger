## about

oblogger is a side-panel plugin for Obsidian that focuses on **tags** as the primary organizational tool. oblogger lets you choose the tag groups you want to display as well as some pre-defined groups such as dailies, recent documents, files, and all of your untagged documents (these pre-defined groups can be hidden)

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
    - supports adding "all tags" group
    - supports tag nesting 
    - supports multiple tags per file and multiple files per tag
    - supports tags in body and frontmatter
  - use a photo as an **avatar** to add some personality to the side panel
    - default avatar will show first letter of vault

## roadmap

  - multi-select
  - expanded frontmatter editing

## faq

- why can't I rename notes/files from the side panel?
  - because it's hard :(. if you figure out how to link into the FileExplorer core plugin in a clean way, please let us know!
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

## how to build the plugin

`npm run dev` for debug and watching

`npm run build` for release

## setting up a dev environment

this should allow you to make changes to CSS files and see them update in obsidian in our test vault

- clone this repo using git. the rest of the documentation will assume it's at "~/Projects/obsidian-oblogger"

### set up gnome builder

- install gnome builder
- open the repo as an existing project in gnome builder
- go to configure project next to the build button
- click commands
- click create command
- call it "dev"
- the command should be `npm run dev`
- set the working directory to `~/Projects/obsidian-oblogger/build` (`$SRCDIR/build` might also work)
- whenever you save a file, it should run the command and refresh the build artifacts in the build directory

### setup the test vault

- install obsidian
- open `~/Projects/obsidian-oblogger/test-vault` in obsidian and trust community plugins
- open community plugins and ensure that "hot reload" plugin is installed and enabled
- click the folder icon next to "installed plugins" to open nautilus at the plugins location
- right click open space in the folder and "open in console" to open console at that location
- enter `ln -s ../../../build oblogger` to create a link from plugins to the build directory
- enter `touch oblogger/.hotreload` to create an empty file that enables the hot reload plugin to auto-refresh obsidian when the plugin's files change
- back in obsidian, click the refresh button next to installed plugins and then find and enable the oblogger plugin


## acknowledgments

we want to thank the [obsidian plugin-dev discord server](https://discordapp.com/channels/686053708261228577/840286264964022302) for all the help they gave us when we felt stuck. if you're reading this and working on a theme, plugin, or just want to engage more with the obsidian community, do yourself a favor and [join that discord channel](https://discord.gg/obsidianmd).

## buy me a coffee

<a href="https://www.buymeacoffee.com/lofttech" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="41" width="174"></a>
