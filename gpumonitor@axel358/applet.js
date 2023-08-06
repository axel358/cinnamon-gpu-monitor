const Applet = imports.ui.applet;
const Main = imports.ui.main;
const Lang = imports.lang;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Settings = imports.ui.settings;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;

class GPUUsageApplet extends Applet.TextApplet {

    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);
        this.settings = new Settings.AppletSettings(this, "gpumonitor@axel358", instance_id);

        this.settings.bind("refresh-interval", "refresh_interval", this.on_settings_changed);
        this.settings.bind("decimal-places", "decimal_places", this.on_settings_changed);
        this.settings.bind("display-style", "display_style", this.on_settings_changed);
        this.settings.bind("use-compact-label", "use_compact_label", this.on_settings_changed);

        this.set_applet_tooltip("Click for more details");

        const menu_manager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        menu_manager.addMenu(this.menu);

        this.info_menu_item = new PopupMenu.PopupMenuItem("Collecting data...", { reactive: false });
        this.menu.addMenuItem(this.info_menu_item);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const item = new PopupMenu.PopupMenuItem(_("Launch Radeontop"));
        item.connect('activate', () => Util.spawnCommandLine("gnome-terminal -t Radeontop -- radeontop"));
        this.menu.addMenuItem(item);

        this.update();
    }

    on_settings_changed() {
        //TODO: This causes performance issues
        //this.update();
    }

    on_applet_clicked(event) {
        this.menu.toggle();
    }

    update() {
        Util.spawn_async(["radeontop", "-l", "1", "-d", "-"], (output) => {
            const gpu_regex = /gpu\s([\d.]+)%/i;
            const vram_regex = /vram\s([\d.]+)%\s([\d.]+)([kmgt]b|b)\b/i;

            const gpu = parseFloat(output.match(gpu_regex)[1]);
            const vram_matches = output.match(vram_regex);
            const vram = parseFloat(vram_matches[1]);

            const formatted_gpu = (this.use_compact_label ? "G: " : "GPU: ") + gpu.toFixed(this.decimal_places) + "% ";
            const formatted_vram = (this.use_compact_label ? "V: " : "VRAM: ") + vram.toFixed(this.decimal_places) + "% ";

            switch (this.display_style) {
                case "column":
                    this.set_applet_label(formatted_gpu + "\n" + formatted_vram);
                    break;
                case "row":
                    this.set_applet_label(formatted_gpu + " " + formatted_vram);
                    break;
                case "gpu":
                    this.set_applet_label(formatted_gpu);
                    break;
                case "vram":
                    this.set_applet_label(formatted_vram);
            }

            //Only retrieve additional info if the menu is open
            if (this.menu.isOpen) {

                Util.spawn_async(["sensors", "radeon-pci-*", "amdgpu-pci-*"], output => {
                    const temp_regex = /(temp1:|edge:)\s+\+([\d.]+°C)/i;
                    const temp = output.match(temp_regex)[2];

                    const vram_mb = parseFloat(vram_matches[2]);
                    const formatted_vram_mb = "<b>VRAM Usage: </b>" + vram_mb.toFixed(this.decimal_places) + vram_matches[3].toUpperCase();
                    const formatted_gpu_long = "<b>GPU Usage: </b>" + gpu.toFixed(this.decimal_places) + "% ";
                    const formatted_temp = "<b>Temperature: </b>" + temp;

                    this.info_menu_item.label.get_clutter_text().set_markup(formatted_gpu_long + "\n" + formatted_vram_mb + "\n" + formatted_temp, true);
                });
            }
        });
        this.update_loop_id = Mainloop.timeout_add(this.refresh_interval, Lang.bind(this, this.update));
    }

    on_applet_removed_from_panel() {
        if (this.update_loop_id > 0) {
            Mainloop.source_remove(this.update_loop_id);
            this.update_loop_id = 0;
        }
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new GPUUsageApplet(metadata, orientation, panel_height, instance_id);
}
