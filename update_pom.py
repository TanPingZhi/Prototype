from pathlib import Path

path = Path("pom.xml")
text = path.read_text()
needle = "        <dependency>\n            <groupId>org.springdoc</groupId>"
if needle not in text:
    raise SystemExit("needle missing")
insert = "        <dependency>\n            <groupId>org.projectlombok</groupId>\n            <artifactId>lombok</artifactId>\n            <version>1.18.32</version>\n            <scope>compileOnly</scope>\n        </dependency>\n        <dependency>\n            <groupId>org.projectlombok</groupId>\n            <artifactId>lombok</artifactId>\n            <version>1.18.32</version>\n            <scope>annotationProcessor</scope>\n        </dependency>\n"
text = text.replace(needle, insert + needle, 1)
path.write_text(text)
