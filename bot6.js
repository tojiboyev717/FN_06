const mineflayer = require('mineflayer');
const Vec3 = require('vec3');

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
    version: '1.18.2',
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
        }, 60 * 1000);
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
    // Warpdanga ishonch hosil qilish
    bot.chat('/is warp sell');

    setTimeout(async () => {
        // 📍 1. Chest joylashuvi
        const chestPosVec = new Vec3(5525, 90, -4377); // ➤ Siz bergan aniq koordinata
        const chestBlock = bot.blockAt(chestPosVec);

        // ❌ Agar bu yerda chest bo‘lmasa, to‘xtaymiz
        if (!chestBlock || chestBlock.name !== 'chest') {
            console.log("❌ Koordinatadagi blok chest emas yoki topilmadi.");
            return;
        }

        let attempts = 0;
        let chest = null;
        const maxAttempts = 3;

        // 🔁 2. Chestni ochishga urinish
        while (!chest && attempts < maxAttempts) {
            try {
                chest = await bot.openChest(chestBlock);
            } catch (error) {
                console.log(`⚠️ Error opening chest: ${error.message}. Retrying...`);
                attempts++;

                if (error.message.includes('timeout of 20000ms')) {
                    console.log("❌ Chest window timeout. Reconnecting...");
                    bot.quit('reconnect');
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        if (!chest) {
            console.log("❌ Chest ochilmadi, barcha urinishlar bekor bo‘ldi.");
            return;
        }

        // 🧪 3. Honey_bottle item ID’sini aniqlash
        const honeyItem = mcData.itemsByName['honey_bottle'];
        if (!honeyItem) {
            console.log("❌ honey_bottle item topilmadi mcData ichida.");
            await chest.close();
            return;
        }

        const honeyId = honeyItem.id;

        // 🍯 4. Honey bottle larni olish
        for (let slot of chest.slots) {
            if (slot?.name === 'honey_bottle' && slot.count > 0) {
                while (slot.count > 0 && bot.inventory.emptySlotCount() > 0) {
                    const countToWithdraw = Math.min(slot.count, 64);
                    try {
                        await chest.withdraw(honeyId, null, countToWithdraw); // ✅ To‘g‘ri ID bilan withdraw
                        slot.count -= countToWithdraw;
                        console.log(`✅ ${countToWithdraw} ta honey_bottle olindi.`);
                    } catch (err) {
                        console.log(`⚠️ Honey olishda xatolik: ${err.message}`);
                        break;
                    }
                }

                if (bot.inventory.emptySlotCount() === 0) {
                    console.log("✅ Inventory to‘ldi. Yana olish imkonsiz.");
                    break;
                }
            }
        }

        // ✅ 5. Chestni yopish va do‘konga kirish
        await chest.close();
        bot.chat('/is shop Food');
    }, 1000); // 1 soniya kutib ochamiz
}

    bot.on('end', () => {
        setTimeout(init, 5000);
    });
}
