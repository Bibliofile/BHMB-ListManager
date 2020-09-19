(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('@bhmb/bot')) :
  typeof define === 'function' && define.amd ? define(['@bhmb/bot'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['@bhmb/bot']));
}(this, (function (bot) { 'use strict';

  var tabContent = "<template>\r\n  <details>\r\n    <summary></summary>\r\n    <div class=\"field\">\r\n      <label class=\"label\">List ID (no spaces, unique)</label>\r\n      <div class=\"control\">\r\n        <input type=\"text\" class=\"input\" data-for=\"id\" />\r\n      </div>\r\n    </div>\r\n    <div class=\"field\">\r\n      <label class=\"label\">Server List</label>\r\n      <select data-for=\"list\" class=\"select\">\r\n        <option value=\"adminlist\">Adminlist</option>\r\n        <option value=\"modlist\">Modlist</option>\r\n        <option value=\"whitelist\">Whitelist</option>\r\n        <option value=\"blacklist\">Blacklist</option>\r\n      </select>\r\n    </div>\r\n    <div class=\"field\">\r\n      <label class=\"label\">List Contents</label>\r\n      <div class=\"control\">\r\n        <textarea class=\"textarea\" data-for=\"content\"></textarea>\r\n      </div>\r\n    </div>\r\n    <button class=\"button is-small is-danger is-outlined\" data-do=\"delete\">Delete</button>\r\n\r\n  </details>\r\n\r\n  <hr>\r\n</template>\r\n\r\n<div id=\"manpages\" class=\"container is-widescreen\">\r\n  <h3 class=\"title\">List Editor</h3>\r\n\r\n  <span class=\"button is-primary is-adding-message\">+</span>\r\n\r\n  <p>\r\n    This extension lets you define and apply lists with commands. This can be used to apply a lockdown, whitelisting\r\n    well known players, or reset staff lists.\r\n  </p>\r\n\r\n  <div class=\"message is-warning\">\r\n    <div class=\"message-header\">\r\n      <p>Warning</p>\r\n    </div>\r\n    <div class=\"message-body\">\r\n      <p>Adding a user to a list DOES NOT automatically add them to the server list.\r\n      </p>\r\n    </div>\r\n  </div>\r\n\r\n  <h3 class=\"subtitle\">Commands</h3>\r\n\r\n  <p>Commands can only be run by the server owner and SERVER.</p>\r\n\r\n  <ul>\r\n    <li><code>/list apply &lt;list id&gt;</code> - apply a list, will overwrite the existing server list.</li>\r\n    <!-- <li><code>/list &lt;list id&gt; add &lt;name&gt;</code> (ADMIN/MOD/OWNER only) - add <code>name</code> to the\r\n      mentioned list.</li>\r\n    <li><code>/list &lt;list id&gt; remove &lt;name&gt;</code> (ADMIN/MOD/OWNER only) - remove <code>name</code> from\r\n      the mentioned list.</li> -->\r\n    <li><code>/list reset &lt;list id&gt;</code> - resets the server list to the <em>previous</em> list. When the bot is\r\n      reloaded, previous lists are lost.</li>\r\n  </ul>\r\n\r\n  <hr>\r\n\r\n  <div class=\"lists\">\r\n    <!-- lists go here -->\r\n  </div>\r\n</div>";

  bot.MessageBot.registerExtension('bibliofile/lists-editor', function (ex) {
      var _a;
      const storedLists = ex.storage.get("lists", []);
      const resetLists = {
          adminlist: [],
          modlist: [],
          whitelist: [],
          blacklist: [],
      };
      ex.world.addCommand("list", (player, args) => {
          const [command, listId] = args.split(/\s+/);
          if (!player.isOwner)
              return;
          if (!["apply", "reset"].includes(command))
              return;
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
          }
          else { // command = "apply"
              ex.world.getLists().then(lists => {
                  resetLists[listToUse.list_id] = lists[listToUse.list_id];
                  return ex.world.setLists({
                      [listToUse.list_id]: listToUse.list
                  });
              })
                  .then(() => ex.bot.send(`Set ${listToUse.list_id} to ${listToUse.id} list.`))
                  .catch(console.error);
          }
      });
      ex.remove = () => ex.world.removeCommand("list");
      const ui = ex.bot.getExports('ui');
      if (!ui)
          return;
      const tab = ui.addTab("List Editor");
      tab.innerHTML = tabContent;
      const template = tab.querySelector("template");
      const listsContainer = tab.querySelector(".lists");
      storedLists.forEach(addList);
      function addList(list) {
          if (!ui)
              return;
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
          ]);
      }
      function saveLists() {
          storedLists.length = 0;
          for (const list of listsContainer.querySelectorAll("details")) {
              const listId = list.querySelector("[data-for='id']").value;
              list.querySelector("summary").textContent = listId;
              storedLists.push({
                  id: listId,
                  list_id: list.querySelector("[data-for='list']").value,
                  list: list.querySelector("[data-for='content']").value.split("\n")
              });
          }
          ex.storage.set("lists", storedLists);
      }
      listsContainer.addEventListener("click", event => {
          var _a, _b, _c;
          const target = event.target;
          if (target instanceof HTMLButtonElement && target.dataset.do === "delete") {
              (_b = (_a = target.parentElement) === null || _a === void 0 ? void 0 : _a.nextElementSibling) === null || _b === void 0 ? void 0 : _b.remove();
              (_c = target.parentElement) === null || _c === void 0 ? void 0 : _c.remove();
              saveLists();
          }
      });
      listsContainer.addEventListener('change', saveLists);
      listsContainer.addEventListener('input', saveLists);
      (_a = tab.querySelector('.is-adding-message')) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
          addList({
              id: Math.random().toString(16).slice(2, 8),
              list_id: "adminlist",
              list: []
          });
          saveLists();
      });
  });

})));
//# sourceMappingURL=bundle.js.map
