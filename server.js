const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { status } = require('minecraft-server-util');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configurações
const serverIP = 'VsxSmp.aternos.me';
const serverPort = 25565;
const webhookURL = 'https://discord.com/api/webhooks/1377053263085572306/wlFGZ8UDvxMDlKTqo_ySS-nZW_v9wxc1wqEKpxbIj3KurqTIt0ReZ9qJ9oLot-76WGpm';
const modpackURL = 'https://drive.usercontent.google.com/download?id=1i_gbhSrcSL40Qr_DvW8ctew_-56Uty5j&export=download&authuser=0';
const siteURL = 'https://vsx-status-server.onrender.com'; // URL do site hospedado no Render
const customWebhookMessageId = '1378494551001665661'; // ID da mensagem a ser editada
let lastStatus = null;
let lastPlayerCount = null;

app.use(cors());
app.use(express.static(__dirname)); // Servir arquivos estáticos da raiz (onde está o index.html)

async function checkServerStatus() {
    const startTime = Date.now();
    try {
        const response = await status(serverIP, serverPort, { timeout: 5000 });
        const ping = Date.now() - startTime;
        const serverStatus = {
            online: true,
            ip: serverIP,
            ping: ping,
            players: {
                online: response.players.online,
                max: response.players.max,
                list: response.players.sample ? response.players.sample.map(p => ({ name: p.name, id: p.id })) : []
            },
            motd: response.motd.clean,
            version: response.version.name,
            favicon: response.favicon || null,
            modpack: modpackURL,
            site: siteURL
        };

        // Atualizar webhook se o status ou número de jogadores mudou
        if (lastStatus !== true || lastPlayerCount !== serverStatus.players.online) {
            const message = `📡 **VSX SMP**\n**💻Site e Modpack:** ${serverStatus.site}\n🌐 **IP**: ${serverStatus.ip}\n👥 **Players**: ${serverStatus.players.online}/${serverStatus.players.max}`;
            await updateWebhook('Atualização do Vsx SMP', message, serverStatus.online ? '65280' : '16711680');
        }

        lastStatus = true;
        lastPlayerCount = serverStatus.players.online;
        return serverStatus;
    } catch (error) {
        const serverStatus = {
            online: false,
            ip: serverIP,
            ping: 0,
            players: { online: 0, max: 0, list: [] },
            motd: 'Indisponível',
            version: 'Indisponível',
            favicon: null,
            modpack: modpackURL,
            site: siteURL
        };

        if (lastStatus !== false) {
            const message = `📡 **VSX SMP**\n**💻Site e Modpack:** ${serverStatus.site}\n🌐 **IP**: ${serverStatus.ip}\n👥 **Players**: 0/0`;
            await updateWebhook('Atualização do Vsx SMP', message, '16711680');
        }

        lastStatus = false;
        lastPlayerCount = 0;
        return serverStatus;
    }
}

async function updateWebhook(title, message, color) {
    try {
        const embed = {
            title: title,
            description: message,
            color: parseInt(color),
            timestamp: new Date().toISOString()
        };

        // Sempre editar a mensagem com o ID fornecido
        await axios.patch(`${webhookURL}/messages/${customWebhookMessageId}`, { embeds: [embed] });
    } catch (error) {
        console.error('Erro ao atualizar webhook:', error.message);
    }
}

app.get('/status', async (req, res) => {
    const serverStatus = await checkServerStatus();
    res.json(serverStatus);
});

// Rota para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Verificar status do servidor a cada 10 segundos
setInterval(checkServerStatus, 10000);

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
