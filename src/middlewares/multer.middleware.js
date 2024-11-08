import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the absolute path from the current directory
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

  
  const upload = multer({ storage, })

  export {upload}
  