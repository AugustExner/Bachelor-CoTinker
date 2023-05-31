CKEditor Plugin for CoTinker

This plugin loosely couples CoTinker with CKEditor using only public API calls. 
It is possible to easily link to a newer or a custom version of CKEditor simply 
by replacing the accompanying .zip-file and updating the link in the 
descriptor.json file.

The .zip-file is an unmodified build of CKEditor made from 
https://ckeditor.com/cke4/builder
with the only requirement that the Shared Space plugin is also enabled if you 
want to map the Menu and Status bars into the CoTinker slide environment.
This file also contains the build options used to build it so that it may easily
be recreated in the future.

The source code for CKEditor may be found in the repository at
https://github.com/ckeditor/ckeditor4
The source code for this plugin is distributed with CoTinker.