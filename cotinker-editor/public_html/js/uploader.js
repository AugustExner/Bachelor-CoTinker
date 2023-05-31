enqueueAfterLoad(()=>{
    class CoTinkerAssetUploader {
        static prepareUploadArea(uploadArea) {
            uploadArea.addEventListener("dragenter", (evt) => {
                uploadArea.setAttribute("transient-class","highlight");
            });
            uploadArea.addEventListener("dragleave", (evt) => {
                if (cQuery(evt.target).closest(".imageAssetUploader").length==0){
                    uploadArea.setAttribute("transient-class","");
                }
            });
            uploadArea.addEventListener("dragover", (evt)=>{
                evt.preventDefault();
            });
            uploadArea.addEventListener("drop", (evt) => {
                evt.preventDefault();

                let files = evt.dataTransfer.files;
                if (files.length === 0) {
                    return;
                }

                if (files.length > 1) {
                    alert("Multi file upload not supported!");
                    return;
                }

                let file = files[0];
                if (webstrate.assets.find(u => u.fileName == file.name && !u.deletedAt)) {
                    alert("An asset with the same name already exists, maybe delete it first?");
                    return;
                }
                // Start the upload
                uploadArea.setAttribute("transient-class", "uploading");

                let url = location.origin + location.pathname;
                Uploader.upload(url, file, file.name).then(()=>{
                    uploadArea.setAttribute("transient-class", "complete");

                    // Append preview to uploader
                    let preview = document.createElement("div");
                    preview.classList.add("preview");
                    preview.setAttribute("data-filename", file.name);

                    if(file.name.toLowerCase().endsWith("png") || file.name.toLowerCase().endsWith("jpg") || file.name.toLowerCase().endsWith("jpeg") || file.name.toLowerCase().endsWith("gif")) {
                        let image = document.createElement("img");
                        image.setAttribute("src", file.name);
                        preview.appendChild(image);
                    }

                    let description = document.createElement("span");
                    description.classList.add("description");
                    description.innerText = file.name;
                    preview.appendChild(description);

                    CoTinkerAssetUploader.prepareDownloadLink(description, file.name);

                    let deleter = document.createElement("button");
                    deleter.classList.add("deleter");
                    deleter.innerText = "X";
                    preview.appendChild(deleter);
                    CoTinkerAssetUploader.prepareDeleter(deleter, file.name);

                    WPMv2.stripProtection(preview);
                    uploadArea.appendChild(preview);
                });
            });

            uploadArea.querySelectorAll("div.preview").forEach((upload)=>{
                let fileName = upload.getAttribute("data-filename");

                let deleter = upload.querySelector("button.deleter");
                if (deleter){
                    CoTinkerAssetUploader.prepareDeleter(deleter, fileName);
                }

                let description = upload.querySelector("span.description");
                CoTinkerAssetUploader.prepareDownloadLink(description, fileName);
            });
        }

        static prepareDeleter(deleter, fileName) {
            deleter.addEventListener("click", ()=>{
                window.webstrate.deleteAsset(fileName, function (err,asset){if (!err) deleter.parentElement.remove()})
            });
        }

        static prepareDownloadLink(description, fileName) {
            description.addEventListener("click", ()=>{
                let a = document.createElement("a");
                a.href = fileName;
                a.click();
            });
        }
    }

    window.CoTinkerAssetUploader = CoTinkerAssetUploader;
});
