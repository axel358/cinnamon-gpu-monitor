const Applet = imports.ui.applet;
const Main = imports.ui.main;
const Lang = imports.lang;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Settings = imports.ui.settings;
const Util = imports.misc.util;

class GPUUsageApplet extends Applet.TextApplet {

    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);
        this.settings = new Settings.AppletSettings(this, "gpumonitor@axel358", instance_id);

        this.settings.bind("refresh-interval", "refresh_interval", this.on_settings_changed);
        this.settings.bind("decimal-places", "decimal_places", this.on_settings_changed);
        this.settings.bind("display-style", "display_style", this.on_settings_changed);

        this._applet_tooltip._tooltip.set_style("text-align:left");

        this.update();
    }

    on_settings_changed() {
        //TODO: This causes performance issues
        //this.update();
    }

    update() {
        Util.spawn_async(["radeontop", "-l", "1", "-d", "-"], (output) => {
            const info = output.toString().trim().split(" ");
            const gpu = parseFloat(info[9]);
            const vram = parseFloat(info[31]);
            const vram_mb = info[32].replace(",", "");

            const formatted_gpu = "GPU: " + gpu.toFixed(this.decimal_places) + "% ";
            const formatted_vram = "VRAM: " + vram.toFixed(this.decimal_places) + "% ";
            const formatted_vram_mb = "<b>Used VRAM: </b>" + vram_mb;
            const formatted_gpu_long = "<b>GPU Usage: </b>" + gpu.toFixed(this.decimal_places) + "% ";

            this.set_applet_tooltip(formatted_gpu_long + "\n" + formatted_vram_mb, true);

            switch(this.display_style){
            case "column":
                this.set_applet_label(formatted_gpu + "\n" + formatted_vram);
                break;
            case "both":
                this.set_applet_label(formatted_gpu + " " + formatted_vram);
                break;
            case "gpu":
                this.set_applet_label(formatted_gpu);
               break;
            case "vram":
                this.set_applet_label(formatted_vram);
        }
        });
        this.update_loop_id = Mainloop.timeout_add(this.refresh_interval, Lang.bind(this, this.update));
    }

    formatBytes(bytes, decimals = 1) {
        if (!+bytes)
            return '0 b';

        const sizes = ['b', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals))} ${sizes[i]}`;
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
