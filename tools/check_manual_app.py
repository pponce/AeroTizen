"""Check the installable widget's manual-app contract without contacting a TV."""

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
        assert not config.findall("t:service", ns), "Unexpected service registration"
        assert config.find("t:setting", ns).get("background-support") == "disable"
        for element in config.iter():
            assert element.get("on-boot") != "true"
            assert element.get("auto-restart") != "true"
            assert not any(
                word in element.get("key", "")
                for word in ("appbootingsupport", "prelaunch.support")
            ), "Unexpected startup metadata"
        html = archive.read("index.html").decode()
        assert html.index('src="js/config.js"') < html.index('src="js/diagnostics.js"')
    print("Verified selectable AeroTizen app with no service or startup registration.")


if __name__ == "__main__":
    check(sys.argv[1])
