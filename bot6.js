const mineflayer = require('mineflayer');

const botUsername = 'FN_06';
const botPassword = 'fort54321';
const admin = 'Umid';
let shouldSendMoney = false;
var playerList = [];
var mcData;

const botOption = {
    host: 'hypixel.uz',
    port: 25565,
    username: botUsername,
    password: botPassword,
    version: '1.18.1',
};

init();

function init() {
    var bot = mineflayer.createBot(botOption);

    bot.on("messagestr", (message) => {
        if (message.startsWith("Skyblock »")) return;
        console.log(message);

        // Server restart bo'lsa chiqish
        if (message === "Server: Serverni kunlik restartiga 30 sekund qoldi") {
            bot.quit("20min");
        }

        // Ro‘yxatdan o‘tish yoki login qilish
        if (message.includes("register")) {
            bot.chat(`/register ${botPassword} ${botPassword}`);
        }
        if (message.includes("login")) {
            bot.chat(`/login ${botPassword}`);
        }

        // 1. "claim" deb yozsangiz, bot /bal yozadi va flagni yoqadi
        if (message.toLowerCase().includes("pay")) {
            shouldSendMoney = true;
            bot.chat("/bal");
            return;
        }

        // 2. Agar "Balance: $" xabari kelsa va flag yoqilgan bo‘lsa
        if (shouldSendMoney && message.includes("Balance: $")) {
            let balanceStr = message.match(/Balance: \$([\d,]+)/);
            if (!balanceStr || balanceStr.length < 2) return;

            let balance = parseInt(balanceStr[1].replace(/,/g, ""));

            if (balance > 0) {
                bot.chat(`/pay ${admin} ${balance}`);
                shouldSendMoney = false; // Keyingi "claim"gacha kutadi
            }
        }
    });

    bot.on("spawn", () => {
        mcData = require("minecraft-data")(bot.version);

        // AFK oldini olish uchun har 3 daqiqada bir sakrash
        setInterval(() => {
            bot.setControlState("jump", true);
            setTimeout(() => bot.setControlState("jump", false), 500);
        }, 3 * 60 * 1000);

        // Serverga kirganda /is warp sell yozish
        setTimeout(() => {
            bot.chat('/is warp sell');
        }, 1000);

        // Har 1 daqiqada bir honey olish
        setInterval(() => {
            withdrawHoney(bot, mcData);
        }, 5 * 60 * 1000);
        // Har 1 daqiqada /is warp sell yozish
        setInterval(() => {
            bot.chat('/is warp sell');
        }, 60 * 1000);
    });


    // Admindan buyruqlarni bajarish
    bot.on("whisper", (usernameSender, message) => {
        if (usernameSender === admin && message.startsWith("! ")) {
            const command = message.replace("! ", "");
            bot.chat(command);
        }
    });
	    
    // Chestdan honey olish va sotish
bot.on('windowOpen', async (window) => {
        setTimeout(() => {
            bot.closeWindow(window);
        }, 19000);
        if (window.title.includes('Island Shop | Food')) {
            let honeyCount = 0;
            bot.inventory.slots.forEach(slot => {
                if (slot?.type != undefined && slot?.type != null && slot?.name == 'honey_bottle') {
                    honeyCount += slot?.count;
                }
            });
            for (let i = 0; i < honeyCount; i++) {
                setTimeout(() => {
                    bot.simpleClick.rightMouse(21, 0, 0);
                }, 20);
            }
            setTimeout(async () => {
                await bot.closeWindow(window);
                bot.chat('/is warp sell');
                bot.chat('/is withdraw money 9999999999999999');
                bot.chat('/bal');
            }, honeyCount * 20 + 100);
            return;
        }
    });
	
    async function withdrawHoney(bot, mcData) {
        bot.chat('/is warp sell');
        setTimeout(async () => {
            var chestPosition = await bot.findBlock({
                matching: mcData.blocksByName.chest.id,
                maxDistance: 5,
            });
            if (!chestPosition) return;

            // Implement retry logic
            let attempts = 0;
            let chest = null;
            const maxAttempts = 3;

            while (!chest && attempts < maxAttempts) {
                try {
                    chest = await bot.openChest(chestPosition);
                } catch (error) {
                    console.log(`Error opening chest: ${error}. Retrying...`);
                    attempts++;
                    console.log(error);
                    if (error.includes(`timeout of 20000ms`)) {
                        await bot.quit('reconnect')
                    }
                    // await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            if (!chest) {
                console.log("Failed to open chest after multiple attempts.");
                return;
            }

            // Function to check if there are any free slots in the inventory
            function hasFreeSlot() {
                return bot.inventory.emptySlotCount() > 0;
            }

            // Function to check if there are any honey bottles left in the chest
            function honeyLeftInChest(chest) {
                return chest.slots.some(slot => slot?.type !== undefined && slot?.type !== null && slot?.name === 'honey_bottle' && slot?.count > 0);
            }

            // Iterate through the chest slots and withdraw honey bottles
            for (let slot of chest.slots) {
                if (slot?.type !== undefined && slot?.type !== null && slot?.name === 'honey_bottle' && slot?.count > 0) {
                    while (slot.count > 0 && hasFreeSlot()) {
                        let countToWithdraw = Math.min(slot.count, bot.inventory.itemLimit - slot.count);
                        try {
                            await chest.withdraw(slot.type, null, countToWithdraw);
                            slot.count -= countToWithdraw;
                        } catch (error) {
                            // console.log(`Error withdrawing items: ${error}`);
                            break;
                        }
                    }
                    if (!hasFreeSlot()) {
                        // console.log("Inventory is full, stopping withdrawal.");
                        break;
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            await chest.close();
            await new Promise(resolve => setTimeout(resolve, 1000));
            bot.chat('/is shop Food');
        }, 500);
    }
	
    bot.on('end', () => {
        setTimeout(init, 5000);
    });
}
