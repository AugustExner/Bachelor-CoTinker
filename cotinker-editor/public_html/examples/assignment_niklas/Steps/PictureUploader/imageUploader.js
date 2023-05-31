enqueueAfterLoad(()=>{
  document.querySelectorAll(".imageAssetUploader").forEach((uploadArea)=>{
      CoTinkerAssetUploader.prepareUploadArea(uploadArea);
  });
});