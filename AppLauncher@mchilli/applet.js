const Main = imports.ui.main;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Util = imports.misc.util;

// const GLib = imports.gi.GLib;
const St = imports.gi.St;

// const Gettext = imports.gettext;

// let UUID;
function log(str) {
    global.log('###################', str);
}


class MyApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        try {
            super(orientation, panelHeight, instanceId);

            this.metadata = metadata;
            this.orientation = orientation;
            this.panelHeight = panelHeight;
            this.instanceId = instanceId;

            if (this.orientation == 3 || this.orientation == 1) {
                this.hide_applet_label(true);
            }

            this.bindSettings();
            this.initMenu();
            this.connectSignals();
            this.initIcons();
            this.initLabel();
        } catch(e) {
            global.logError(e);
        }
    }

    bindSettings() {
        this.settings = new Settings.AppletSettings(this, this.metadata.uuid, this.instanceId);
        this.settings.bind("appList", "appList", this.updateMenu);
        this.settings.bind("visibleAppIcons", "visibleAppIcons", this.updateMenu);
        this.settings.bind("visibleLauncherLabel", "visibleLauncherLabel", this.initLabel);
        this.settings.bind("launcherLabel", "launcherLabel", this.initLabel);
        this.settings.bind("visibleLauncherIcon", "visibleLauncherIcon", this.initIcons);
        this.settings.bind("launcherIcon", "launcherIcon", this.initIcons);
    }

    connectSignals() {
        this.menu.connect('open-state-changed', this.toggleIcon);
        // this._applet_context_menu.connect('open-state-changed', (e) => {this.toggleIcon(e.isOpen)});
    }

    initMenu() {
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, this.orientation);
        this.menuManager.addMenu(this.menu);
        this.updateMenu();
    }

    updateMenu() {
        this.menu.removeAll();

        for (let i = 0; i < this.appList.length; i++) {
            let name = this.appList[i].name;
            let icon = this.appList[i].icon;
            let item;

            if (this.visibleAppIcons) {
                item = new PopupMenu.PopupIconMenuItem(name, icon, St.IconType.FULLCOLOR)
                item._icon.set_icon_size(this.panelHeight);
            } else {
                item = new PopupMenu.PopupMenuItem(name)
            }
            item.connect('activate', () => {this.run(this.appList[i].command);});

            this.menu.addMenuItem(item);
        }
        // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    initIcons() {
        if (this.visibleLauncherIcon) {
            let iconMap = [
                ['pan-down-symbolic', 'pan-up-symbolic'],
                ['pan-start-symbolic', 'pan-end-symbolic'],
                ['pan-up-symbolic', 'pan-down-symbolic'],
                ['pan-end-symbolic', 'pan-start-symbolic']
            ]
            this.popupIcons = iconMap[this.orientation];

            if (this.launcherIcon !== '') {
                this.popupIcons[0] = this.launcherIcon;
            }

            this.toggleIcon(false);
        } else {
            this.hide_applet_icon();
        }
    }

    toggleIcon() {
        if (this.menu.isOpen) {
            this.set_applet_icon_symbolic_name(this.popupIcons[1]);
        } else {
            if (this.popupIcons[0].endsWith('symbolic')) {
                this.set_applet_icon_symbolic_name(this.popupIcons[0]);
            } else {
                this.set_applet_icon_name(this.popupIcons[0]);
            }
        }
    }

    initLabel() {
        this.set_applet_tooltip(this.launcherLabel);
        if (this.orientation == 3 || this.orientation == 1) {
            return
        }
        this.set_applet_label(this.launcherLabel);
        this.hide_applet_label(!this.visibleLauncherLabel);
    }

    notify(str) {
        Main.notify(str);
    }

    run(cmd) {
        Util.spawnCommandLine(cmd);
    }

    on_applet_clicked(event) {
        if (this.appList.length === 0) {
            // this.run('xlet-settings applet ' + this.metadata.uuid + ' ' + this.instanceId);
            this._applet_context_menu.toggle();
        } else {
            this.menu.toggle();
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new MyApplet(metadata, orientation, panelHeight, instanceId);
}
