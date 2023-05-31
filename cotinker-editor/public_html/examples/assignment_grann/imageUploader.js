enqueueAfterLoad(()=>{  
    /*document.querySelectorAll(".imageAssetUploader").forEach((uploadArea)=>{
        CoTinkerAssetUploader.prepareUploadArea(uploadArea);
    });*/

    const backgroundUpload = document.querySelector(".imageAssetUploader");
    if (backgroundUpload) {
        CoTinkerAssetUploader.prepareUploadArea(backgroundUpload);
    }

    const productUpload = document.querySelector(".imageAssetUploaderProduct");
    if (productUpload) {
        CoTinkerAssetUploader.prepareUploadArea(productUpload);
    }
});