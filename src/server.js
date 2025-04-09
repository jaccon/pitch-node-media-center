require('dotenv').config(); // Carrega as variáveis do .env
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const app = express();

// Configuração do EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, process.env.SHARED_DIR)));
app.use(express.json());

// Função para listar arquivos e diretórios
function getDirContents(dirPath) {
    const fullPath = path.join(__dirname, process.env.SHARED_DIR, dirPath);
    if (!fs.existsSync(fullPath)) return { files: [], dirs: [] };

    const contents = fs.readdirSync(fullPath, { withFileTypes: true });
    const files = contents
        .filter(item => item.isFile())
        .map(item => {
            const stats = fs.statSync(path.join(fullPath, item.name));
            return { name: item.name, isFile: true, size: stats.size };
        });

    const dirs = contents
        .filter(item => item.isDirectory())
        .map(item => ({ name: item.name, isFile: false }));

    return [...dirs, ...files];
}

// Rota principal
app.get('/', (req, res) => {
    const currentPath = req.query.path || '';
    const contents = getDirContents(currentPath);
    res.render('index', { contents, currentPath });
});

// Rota para upload de chunks
app.post('/upload-chunk', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    const { chunkIndex, totalChunks, fileName, currentPath } = req.query;
    const tempDir = path.join(__dirname, process.env.SHARED_DIR, 'temp', fileName);
    const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
    const finalPath = path.join(__dirname, process.env.SHARED_DIR, currentPath || '', fileName);

    try {
        await fs.ensureDir(tempDir);
        await fs.writeFile(chunkPath, req.body);

        if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
            await fs.ensureDir(path.dirname(finalPath));
            const writeStream = fs.createWriteStream(finalPath);

            for (let i = 0; i < totalChunks; i++) {
                const chunkFile = path.join(tempDir, `chunk-${i}`);
                const chunkData = await fs.readFile(chunkFile);
                writeStream.write(chunkData);
                await fs.remove(chunkFile);
            }
            writeStream.end();

            await fs.remove(tempDir);
            res.json({ success: true, message: 'Upload concluído!' });
        } else {
            res.json({ success: true, message: `Chunk ${chunkIndex} recebido` });
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar chunk' });
    }
});

// Rota para criar diretórios
app.post('/create-dir', express.urlencoded({ extended: true }), (req, res) => {
    const dirName = req.body.dirName;
    const currentPath = req.body.path || '';
    const newDirPath = path.join(__dirname, process.env.SHARED_DIR, currentPath, dirName);
    fs.ensureDirSync(newDirPath);
    res.redirect(`/?path=${currentPath}`);
});

// Rota para remover arquivos
app.post('/delete-file', express.urlencoded({ extended: true }), (req, res) => {
    const fileName = req.body.file;
    const currentPath = req.body.path || '';
    const filePath = path.join(__dirname, process.env.SHARED_DIR, currentPath, fileName);
    if (fs.existsSync(filePath)) {
        fs.removeSync(filePath);
    }
    res.redirect(`/?path=${currentPath}`);
});

// Rota para remover diretórios
app.post('/delete-dir', express.urlencoded({ extended: true }), (req, res) => {
    const dirName = req.body.dir;
    const currentPath = req.body.path || '';
    const dirPath = path.join(__dirname, process.env.SHARED_DIR, currentPath, dirName);
    if (fs.existsSync(dirPath)) {
        fs.removeSync(dirPath);
    }
    res.redirect(`/?path=${currentPath}`);
});

app.listen(process.env.PORT, () => {
    console.log(`Servidor rodando em http://localhost:${process.env.PORT}`);
});