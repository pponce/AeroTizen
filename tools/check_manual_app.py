"""Check the widget's default App mode and opt-in watcher without contacting a TV."""

import sys
import xml.etree.ElementTree as ET
import zipfile


def check(path):
    with zipfile.ZipFile(path) as archive:
        config = ET.fromstring(archive.read("config.xml"))
        ns = {"t": "http://tizen.org/ns/widgets", "w": "http://www.w3.org/ns/widgets"}
        app = config.find("t:application", ns)
        assert app is not None and app.get("id") == "DclHome001.Home"
        assert config.find("w:name", ns).text == "AeroTizen"
        assert config.find("w:icon", ns).get("src") in archive.namelist()
        assert config.find("w:content", ns).get("src") in archive.namelist()
        services = config.findall("t:service", ns)
        assert len(services) == 1 and services[0].get("id") == "DclHome001.Watcher"
        assert services[0].find("t:content", ns).get("src") == "service/index.js"
        assert services[0].get("on-boot") == "true" and services[0].get("auto-restart") == "true"
        assert b"MANUAL_APP: true" in archive.read("js/config.js")
        assert "service/app-mode.js" in archive.namelist()
        # Keep the original package capabilities so App mode Off restores the watcher.
        # Samsung prelaunch loads the UI in the background, independently of our watcher gate.
        assert config.find("t:setting", ns).get("background-support") == "enable"
        metadata = {element.get("key"): element.get("value") for element in config.findall("t:metadata", ns)}
        assert metadata.get("http://samsung.com/tv/metadata/prelaunch.support") == "true"
        for element in config.iter():
            assert "appbootingsupport" not in element.get("key", ""), "Unexpected startup metadata"
        html = archive.read("index.html").decode()
        assert html.index('src="js/config.js"') < html.index('src="js/diagnostics.js"')
        assert html.index('src="js/app-mode.js"') < html.index('src="js/homewatch.js"')
    print("Verified default App mode package with its opt-in watcher control service.")


if __name__ == "__main__":
    check(sys.argv[1])
