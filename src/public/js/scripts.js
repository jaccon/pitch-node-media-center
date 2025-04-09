// SweetAlert2 para criar pastas
document.getElementById('createFolderBtn').addEventListener('click', () => {
    Swal.fire({
        title: 'Criar Nova Pasta',
        input: 'text',
        inputLabel: 'Nome da pasta',
        inputPlaceholder: 'Digite o nome da pasta',
        showCancelButton: true,
        confirmButtonText: 'Criar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return 'Você precisa digitar um nome!';
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/create-dir';
            form.innerHTML = `
                <input type="hidden" name="dirName" value="${result.value}">
                <input type="hidden" name="path" value="${new URLSearchParams(window.location.search).get('path') || ''}">
            `;
            document.body.appendChild(form);
            form.submit();
        }
    });
  });
  
  // Upload por chunks
  const fileInput = document.getElementById('fileInput');
  const uploadFilesBtn = document.getElementById('uploadFilesBtn');
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk
  
  uploadFilesBtn.addEventListener('click', async () => {
    const files = fileInput.files;
    if (!files.length) {
        Swal.fire('Atenção!', 'Selecione pelo menos um arquivo.', 'warning');
        return;
    }
  
    const currentPath = document.getElementById('currentPath').value;
  
    // Enviar múltiplos arquivos ao mesmo tempo
    const uploadPromises = [];
  
    for (const file of files) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
        Swal.fire({
            title: `Enviando ${file.name}`,
            text: 'Por favor, aguarde...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
  
        // Cria uma promise para cada arquivo
        const uploadPromise = (async () => {
            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
  
                const url = `/upload-chunk?chunkIndex=${i}&totalChunks=${totalChunks}&fileName=${encodeURIComponent(file.name)}&currentPath=${encodeURIComponent(currentPath)}`;
  
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        body: chunk,
                        headers: {
                            'Content-Type': 'application/octet-stream'
                        }
                    });
  
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);
  
                    if (i + 1 === totalChunks) {
                        Swal.fire('Sucesso!', `${file.name} enviado com sucesso!`, 'success').then(() => {
                            window.location.reload();
                        });
                    }
                } catch (error) {
                    Swal.fire('Erro!', `Falha ao enviar ${file.name}: ${error.message}`, 'error');
                    console.error('Erro no chunk', i, error);
                    break;
                }
            }
        })();
  
        // Adiciona a promise à lista de uploads
        uploadPromises.push(uploadPromise);
    }
  
    // Espera que todos os uploads terminem
    await Promise.all(uploadPromises);
  
    fileInput.value = ''; // Limpa o input após o upload
    bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide(); // Fecha o modal
  });
  
  console.log("Gerenciador de arquivos carregado!");
  