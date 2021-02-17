require("dotenv").config()
const { Client, MessageAttachment } = require("discord.js");
const { exec } = require("child_process");
const { readdir } = require("fs");
// const express = require("express");
// const app = express()

// app.use(express.static('./public'));
// app.listen(1024)


const DiscordClient = new Client();

DiscordClient.on("ready", () => {
    console.info("Ready.");
});

DiscordClient.on("message", async message => {
    if(!message.content.toLowerCase().startsWith("compile https")) return;

    let args = message.content.split(" ").slice(1);

    if(!args[0]) return message.reply("You need to provide a GitHub repo URL, and the repo has to be compatible with `mvn clean install`.");

    exec(`git clone ${args[0]}`, (stdin, stdout, err) => {
        if (err && !err.includes("Cloning into")) return message.reply(`Halting, something went wrong.\n\n\`\`\`\n${err}\`\`\``);
        else message.channel.send(stdout || err);

        message.channel.send(`Compiling... (this may take a while.)`)
        readdir(`./${args[0].split("/").reverse()[0]}`, async (err, files) => {
            let mvn = files.includes("pom.xml");
            let gradle = files.includes("build.gradle");

            if (mvn) return await buildMaven();
            else return await buildGradle();
        });
    });

    async function buildMaven() {
        let cmd = `cd ${args[0].split("/").reverse()[0]} && mvn clean install`
        if(args[1]) cmd = `cd ${args[0].split("/").reverse()[0]} && git checkout ${args[1]} && mvn clean install`
        exec(cmd, (stdin, stdout, err) => {
            
            if (err && !err.includes("An illegal reflective access operation has occurred")) return message.reply(`Halting, something went wrong.\n\n\`\`\`\n${err}\`\`\``);
            else message.channel.send(stdout.slice(stdout.length-1000), { code: "bash" });

            exec(`cd ${args[0].split("/").reverse()[0]}/target && ls`, async (stdin, stdout, err) => {
                await message.channel.send(`I cannot automatically send the compiled file. Please find the file ending in \`.jar\` and run \`send <file>.jar\`.\n\n\`\`\`bash\n${stdout}\`\`\``)
                let send = await message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1 });

                let attachment = new MessageAttachment(`${process.cwd()}/${args[0].split("/").reverse()[0]}/target/${send.first().content.split(" ")[1]}`, `${args[0].split("/").reverse()[0]}.jar`);

                return message.reply(`One freshly compiled plugin, straight from da hood :sunglasses:`, { files: [attachment] })
            })
        });
    }

    async function buildGradle() {
        let cmd = `cd ${args[0].split("/").reverse()[0]} && chmod +x ./gradlew && ./gradlew build`
        if(args[1]) cmd = `cd ${args[0].split("/").reverse()[0]} && git checkout ${args[1]} && chmod +x ./gradlew && ./gradlew build`
        message.channel.send(`Building gradle plugin... ***__this WILL take a while.__***`)
        exec(cmd, (stdin, stdout, err) => {
            if (err) console.error(err)
            /*if (err && !err.includes("An illegal reflective access operation has occurred")) return message.reply(`Halting, something went wrong.\n\n\`\`\`\n${err}\`\`\``);
            else*/ message.channel.send(stdout.slice(stdout.length-1000), { code: "bash" });

            exec(`cd ${args[0].split("/").reverse()[0]}/bin && zip plugins.zip ./*`, async (stdin, stdout, err) => {
                let attachment = new MessageAttachment(`${process.cwd()}/${args[0].split("/").reverse()[0]}/bin/plugins.zip`, 'plugins.zip')
                await message.reply(`One freshly compiled plugin, straight from da hood :sunglasses:`, { files: [attachment] })
                return exec(`rm ${args[0].split("/").reverse()[0]}/ -rf`)
            })

            
        });
    }
});

DiscordClient.login(process.env.TOKEN);