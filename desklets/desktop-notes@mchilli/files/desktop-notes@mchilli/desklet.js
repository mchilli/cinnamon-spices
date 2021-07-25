const Cinnamon = imports.gi.Cinnamon;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Gio = imports.gi.Gio;

const Settings = imports.ui.settings;
const Desklet = imports.ui.desklet;

const Util = imports.misc.util;
const SignalManager = imports.misc.signalManager;

const Gettext = imports.gettext;

const UUID = 'desktop-notes@mchilli';

function _(str) {
    return Gettext.dgettext(UUID, str);
}

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + '/.local/share/locale');

class MyDesklet extends Desklet.Desklet {
    constructor(metadata, instanceId) {
        super(metadata, instanceId);

        this.metadata = metadata;
        this.instanceId = instanceId;

        this.buildUI();

        this.signalManager = new SignalManager.SignalManager(null);

        try {
            this.settings = new Settings.DeskletSettings(this, this.metadata['uuid'], instanceId);

            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'note-from-file',
                'noteFromFile',
                this.on_setting_changed
            );
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'note-content',
                'noteContent',
                this.on_setting_changed
            );
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'file-path',
                'filePath',
                this.on_setting_changed
            );
            this.settings.bindProperty(Settings.BindingDirection.IN, 'edit-cmd', 'editCmd');
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'font-style',
                'fontStyle',
                this.on_font_changed
            );
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'font-color',
                'fontColor',
                this.on_font_changed
            );
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'font-align',
                'fontAlign',
                this.on_font_changed
            );
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'font-shadow-color',
                'fontShadowColor',
                this.on_font_changed
            );
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                'font-shadow-offset',
                'fontShadowOffset',
                this.on_font_changed
            );
        } catch (e) {
            global.logError(e);
        }

        this._menu.addAction(_('Edit …'), () => this.edit_file());

        this.on_setting_changed();
        this.on_font_changed();
    }

    buildUI() {
        this.window = new St.Bin();
        this.text = new St.Label();

        this.text.set_text('');
        this.container = new St.BoxLayout({ vertical: true, style_class: 'note-container' });

        this.container.add(this.text);

        this.window.add_actor(this.container);
        this.setContent(this.window);

        this.setHeader(_('Desktop Notes'));
    }

    on_setting_changed() {
        if (this.noteFromFile) {
            // try load content from file
            if (this.filePath === '') {
                this.text.set_text(_('No File selected'));
            } else {
                this.on_file_changed();
            }
        } else {
            // load content from desklet settings
            if (this.signalManager.getSignals().length > 0)
                this.signalManager.disconnectAllSignals();
            this.text.set_text(this.noteContent);
        }
    }

    on_file_changed() {
        let filePathChanged = decodeURIComponent(this.filePath.replace('file://', ''));
        if (this.decodeFilePath !== filePathChanged) {
            // new file selected
            this.decodeFilePath = filePathChanged;
            this.signalManager.disconnectAllSignals();
        }

        let file = Gio.file_new_for_path(this.decodeFilePath);
        file.load_contents_async(null, (file, response) => {
            // load file async
            try {
                let [success, contents, tag] = file.load_contents_finish(response);
                if (success) {
                    this.text.set_text(contents.toString());
                } else {
                    this.text.set_text(_("Can't read file"));
                }
                GLib.free(contents);
            } catch (err) {
                this.text.set_text(err.message);
            }
        });

        if (this.signalManager.getSignals().length === 0) {
            // bind filemonitor for content refresh
            let fileMonitor = file.monitor_file(Gio.FileMonitorFlags.WATCH_MOUNTS, null);
            this.signalManager.connect(
                fileMonitor,
                'changed',
                (filemonitor, file, other_file, event_type) => {
                    if (event_type === 1) {
                        this.on_file_changed();
                    }
                }
            );
        }
    }

    on_font_changed() {
        let font = this.fontStyle.split(' ');
        let style = '';
        if (font.indexOf('Bold') != -1) {
            font.splice(font.indexOf('Bold'), 1);
            style += 'font-weight: bold';
        }
        if (font.indexOf('Italic') != -1) {
            font.splice(font.indexOf('Italic'), 1);
            style += 'font-style: italic';
        }
        if (font.indexOf('Oblique') != -1) {
            font.splice(font.indexOf('Oblique'), 1);
            style += 'font-style: oblique';
        }
        if (font.indexOf('Condensed') != -1) {
            font.splice(font.indexOf('Condensed'), 1);
            style += 'font-stretch: condensed';
        }
        font = [font.pop(), font.join(' ')];
        this.container.style = `
            ${style};
            font-family: ${font[1]};
            font-size: ${font[0]}pt;
            color: ${this.fontColor};
            text-align: ${this.fontAlign};
            text-shadow: ${this.fontShadowOffset}px ${this.fontShadowOffset}px 1px ${this.fontShadowColor};
        `;
    }

    edit_file() {
        if (this.noteFromFile) {
            if (this.editCmd != '') {
                Util.spawnCommandLine(this.editCmd.replace('%f', `"${this.decodeFilePath}"`));
            }
        } else {
            Util.spawnCommandLine(`xlet-settings desklet ${this.metadata.uuid} ${this.instanceId}`);
        }
    }

    on_desklet_removed() {
        if (this.signalManager.getSignals().length > 0) this.signalManager.disconnectAllSignals();
    }
}

function main(metadata, instanceId) {
    return new MyDesklet(metadata, instanceId);
}
