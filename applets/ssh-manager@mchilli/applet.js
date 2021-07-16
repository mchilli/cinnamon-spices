const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const Gettext = imports.gettext;
const Settings = imports.ui.settings;
const Util = imports.misc.util;
const St = imports.gi.St;

const UUID = 'ssh-manager@mchilli';
const APPNAME = 'SSH Manager';

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + '/.local/share/locale');

function _(str) {
    return Gettext.dgettext(UUID, str);
}

class MyApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        try {
            super(orientation, panelHeight, instanceId);

            this.metadata = metadata;
            this.orientation = orientation;
            this.panelHeight = panelHeight;
            this.instanceId = instanceId;

            this.set_applet_tooltip(APPNAME);
            this.bindSettings();
            this.initMenu();

            this.updateIcon();
            this.updateMenu();
        } catch (e) {
            global.logError(e);
        }
    }

    bindSettings() {
        this.settings = new Settings.AppletSettings(this, this.metadata.uuid, this.instanceId);

        this.settings.bind('connections', 'connections', this.updateMenu);
        this.settings.bind('applet-icon', 'appletIcon', this.updateIcon);
        this.settings.bind('notification-enabled', 'notificationEnabled', this.updateIcon);

        this.settings.bind('terminal-app', 'terminalApp');
        this.settings.bind('terminal-exec-flag', 'terminalExecFlag');

        this.settings.bind('custom-title', 'customTitle');
        this.settings.bind('custom-title-flag', 'customTitleFlag');

        this.settings.bind('custom-profile', 'customProfile');
        this.settings.bind('custom-profile-flag', 'customProfileFlag');
    }

    initMenu() {
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, this.orientation);
        this.menuManager.addMenu(this.menu);
    }

    updateMenu() {
        this.menu.removeAll();

        let groups = {};

        if (this.connections.length > 0) {
            this.connections.forEach((conn) => {
                let name = conn.name;
                let group = conn.group;
                let item = new PopupMenu.PopupMenuItem(name);
                item.connect('activate', () => {
                    this.openConnection(name, conn.host, conn.user, conn.flags, conn.profile);
                });

                if (group == '') {
                    this.menu.addMenuItem(item);
                } else {
                    if (Object.keys(groups).includes(group)) {
                        groups[group].menu.addMenuItem(item);
                    } else {
                        let subMenu = new PopupMenu.PopupSubMenuMenuItem(group);
                        groups[group] = subMenu;
                        subMenu.menu.addMenuItem(item);
                        this.menu.addMenuItem(subMenu);
                    }
                }
            });
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let item = new PopupMenu.PopupMenuItem(_('Edit Connections'));
        item.connect('activate', () => {
            this.configureApplet();
        });
        this.menu.addMenuItem(item);
    }

    showNotification(msg) {
        let source = new MessageTray.SystemNotificationSource();
        Main.messageTray.add(source);

        let icon = new St.Icon({
            icon_name: this.appletIcon,
            icon_type: St.IconType.SYMBOLIC,
            icon_size: 24,
        });

        let notification = new MessageTray.Notification(source, APPNAME, msg, { icon: icon });
        notification.setTransient(true);
        source.notify(notification);
    }

    updateIcon() {
        if (this.appletIcon.endsWith('symbolic')) {
            this.set_applet_icon_symbolic_name(this.appletIcon);
        } else {
            this.set_applet_icon_name(this.appletIcon);
        }
    }

    flagTypeWhitespace(flag) {
        return flag.endsWith('=') ? `${flag}` : `${flag} `;
    }

    openConnection(name, host, user, flags = '', profileName) {
        let title = this.customTitle
            ? `${this.flagTypeWhitespace(this.customTitleFlag)}${name}`
            : '';
        let profile = this.customProfile
            ? `${this.flagTypeWhitespace(this.customProfileFlag)}${profileName}`
            : '';

        let exec = `${this.terminalExecFlag} "ssh ${user ? `-l ${user}` : ''} ${flags} ${host}"`;

        Util.spawnCommandLine(`${this.terminalApp} ${title} ${profile} ${exec}`);

        if (this.notificationEnabled) {
            this.showNotification(`${_('Connecting to')} ${name}`);
        }
    }

    on_applet_clicked(event) {
        this.menu.toggle();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new MyApplet(metadata, orientation, panelHeight, instanceId);
}
