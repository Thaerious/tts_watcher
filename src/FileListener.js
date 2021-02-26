import Uploader from './Uploader.js';
import constants from './Constants.js';
import Path from 'path';
import chokidar from 'chokidar';

/**
 * Listen for changes in the TTS script directories.
 * Delays the notification in case of multiple updates.
 */
class FileListener {

    /**
     * When one or more valid updates occur callback is invoked with all the
     * root GUIDs.  
     * @param {object} includes a map of includes to GUIDs
     * @param {function} cb callback function invoked on update with the list of script GUIDs that are affected.
     */
    constructor(includeScanner, cb) {
        this.updatedFiles = new Set();
        this.includeScanner = includeScanner;
        this.timeout = null;
        this.cb = cb;
        this.start();
    }

    /**
     * Do not trigger an update for the next notification.
     */
    skipNextUpdate(){
        this.skip = true;
    }

    /**
     * Begin listening for file changes inthe Include and Script directories.
     * Note all changes within the delay time will not trigger an update.
     * Delay time is set in 'constants.UPDATE_DELAY'.
     */
    start() {
        this.includeWatcher = chokidar.watch(constants.INCLUDE_DIR, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        this.scriptWatcher = chokidar.watch(constants.SCRIPT_DIR, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        this.includeWatcher.on('change', path => this.includeUpdate(path));
        this.scriptWatcher.on('change', path => this.scriptUpdate(path));
    }

    includeUpdate(filename) {    
        let scriptName = filename.substring(constants.INCLUDE_DIR.length - 1, filename.indexOf("."));
        scriptName = scriptName.replaceAll("\\", "/");
        let guids = this.includeScanner.getMap()[scriptName];
        console.log("'" + scriptName + "' update detected");  
        if (!guids) return;

        for (let guid of guids) {
            this.includeScanner.scan([guid]);
            this.updatedFiles.add(guid);
        }
        this.setTimer();
    }

    scriptUpdate(filename) {
        let guid = filename.substring(constants.SCRIPT_DIR.length - 1, filename.indexOf("."));
        this.includeScanner.scan([guid]);
        this.updatedFiles.add(guid);
        this.setTimer();
    }
    
    setTimer(){
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout((event) => {
            if (this.skip){
                this.skip = false;
            } else {
                this.cb(this.updatedFiles);                
            }
            this.updatedFiles = new Set();
        }, constants.UPDATE_DELAY);
    }
}

export default FileListener;