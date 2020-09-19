import { MessageBot } from '@bhmb/bot'
import { UIExtensionExports } from '@bhmb/ui'

import tabContent from "./tab.html"

type WorldLists = import("blockheads-api-interface").WorldLists;

interface StoredList {
  id: string;
  list_id: keyof WorldLists;
  list: string[];
}

MessageBot.registerExtension('bibliofile/lists-editor', function (ex) {
  const storedLists = ex.storage.get<StoredList[]>("lists", []);

  const resetLists: WorldLists = {
    adminlist: [],
    modlist: [],
    whitelist: [],
    blacklist: [],
  };

  ex.world.addCommand("list", (player, args) => {
    const [command, listId] = args.split(/\s+/);

    if (!player.isOwner) return;
    if (!["apply", "reset"].includes(command)) return;

    const listToUse = storedLists.find(list => list.id === listId);
    if (!listToUse) {
      ex.bot.send("ERROR: /list could not find requsted list.");
      return;
    }

    if (command === "reset") {
      ex.world.setLists({
        [listToUse.list_id]: resetLists[listToUse.list_id]
      })
      .then(() => ex.bot.send(`Reset ${listToUse.list_id} to previous list.`))
      .catch(console.error);
    } else { // command = "apply"
      ex.world.getLists().then(lists => {
        resetLists[listToUse.list_id] = lists[listToUse.list_id];
        return ex.world.setLists({
          [listToUse.list_id]: listToUse.list
        })
      })
      .then(() => ex.bot.send(`Set ${listToUse.list_id} to ${listToUse.id} list.`))
      .catch(console.error);
    }
  });

  ex.remove = () => ex.world.removeCommand("list");

  const ui = ex.bot.getExports('ui') as UIExtensionExports | undefined
  if (!ui) return

  const tab = ui.addTab("List Editor");
  tab.innerHTML = tabContent;

  const template = tab.querySelector("template")!;
  const listsContainer = tab.querySelector(".lists") as HTMLElement;

  storedLists.forEach(addList);

  function addList(list: StoredList) {
    if (!ui) return;

    ui.buildTemplate(template, listsContainer, [
      {
        selector: "summary",
        text: list.id
      },
      {
        selector: "[data-for='id']",
        value: list.id
      },
      {
        selector: "[data-for='list']",
        value: list.list_id
      },
      {
        selector: "[data-for='content']",
        value: list.list.join('\n')
      }
    ])
  }

  function saveLists() {
    storedLists.length = 0;

    for (const list of listsContainer.querySelectorAll("details")) {
      const listId = list.querySelector<HTMLInputElement>("[data-for='id']")!.value;

      list.querySelector("summary")!.textContent = listId;

      storedLists.push({
        id: listId,
        list_id: list.querySelector<HTMLSelectElement>("[data-for='list']")!.value as keyof WorldLists,
        list: list.querySelector<HTMLTextAreaElement>("[data-for='content']")!.value.split("\n")
      });
    }

    ex.storage.set("lists", storedLists);
  }

  listsContainer.addEventListener("click", event => {
    const target = event.target;
    if (target instanceof HTMLButtonElement && target.dataset.do === "delete") {
      target.parentElement?.nextElementSibling?.remove();
      target.parentElement?.remove();
      saveLists();
    }
  })

  listsContainer.addEventListener('change', saveLists);
  listsContainer.addEventListener('input', saveLists);

  tab.querySelector('.is-adding-message')?.addEventListener("click", () => {
    addList({
      id: Math.random().toString(16).slice(2, 8),
      list_id: "adminlist",
      list: []
    });
    saveLists();
  })
})
