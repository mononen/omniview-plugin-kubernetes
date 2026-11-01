package helm

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"strconv"
)

// normalizeJSONNumbers preserves integer tokens while adapting Helm's JSON metadata.
// Release Config bypasses this conversion and retains its original native scalar types.
func normalizeJSONNumbers(value any) any {
	switch v := value.(type) {
	case json.Number:
		if n, err := v.Int64(); err == nil {
			return n
		}
		if n, err := v.Float64(); err == nil {
			return n
		}
		return v
	case map[string]interface{}:
		for key, item := range v {
			v[key] = normalizeJSONNumbers(item)
		}
	case []interface{}:
		for i, item := range v {
			v[i] = normalizeJSONNumbers(item)
		}
	}
	return value
}

func validateActionInput(request resource.ActionRequest) error {
	if err := resource.ValidateValue(request.Input); err != nil {
		return err
	}
	if request.Input.Kind != "map" && request.Input.Kind != "null" {
		return fmt.Errorf("Helm action input must be an object or null")
	}
	for _, key := range []string{"revision", "revision1", "revision2", "max"} {
		value, exists := request.Input.Map[key]
		if !exists {
			continue
		}
		if value.Kind != "int64" {
			return fmt.Errorf("%s must retain signed integer intent", key)
		}
		number, err := strconv.ParseInt(value.Int, 10, 32)
		if err != nil || number < 0 {
			return fmt.Errorf("%s is outside Helm integer range", key)
		}
		if key == "max" && (number < 1 || number > 256) {
			return fmt.Errorf("history max must be between 1 and 256")
		}
	}
	return nil
}

// helmEditorSchema preserves the raw native schema without claiming values
// validation. A schema without $schema uses Helm's native JSON-schema dialect,
// not an invented standards revision.
func helmEditorSchema(document []byte, uri, fileMatch string) (resource.EditorSchema, int, error) {
	if err := resource.ValidateJSON(document); err != nil {
		return resource.EditorSchema{}, 0, err
	}
	dialect := "helm-json-schema"
	trimmed := bytes.TrimSpace(document)
	if len(trimmed) > 0 && trimmed[0] == '{' {
		var declaration struct {
			Dialect string `json:"$schema"`
		}
		if err := json.Unmarshal(document, &declaration); err != nil {
			return resource.EditorSchema{}, 0, resource.NewError("INVALID_REQUEST", "invalid Helm schema declaration")
		}
		if declaration.Dialect != "" {
			dialect = declaration.Dialect
		}
	} else if !bytes.Equal(trimmed, []byte("true")) && !bytes.Equal(trimmed, []byte("false")) {
		return resource.EditorSchema{}, 0, resource.NewError("INVALID_REQUEST", "Helm schema must be an object or boolean")
	}
	digest := sha256.Sum256(document)
	revision := hex.EncodeToString(digest[:])
	schema := resource.EditorSchema{
		Type: ReleaseType, FileMatch: fileMatch, URI: uri, Language: "yaml",
		Binding: resource.SchemaBinding{
			State: "available", Revision: &revision, Dialect: dialect, Root: "",
			Document: document, Validation: "none", Unvalidated: []string{},
		},
	}
	// Bound retained raw documents plus worst-case escaped metadata before the
	// caller appends another schema. The fixed allowance covers field syntax.
	metadataBytes := 1024 + 6*(len(schema.Type)+len(fileMatch)+len(uri)+len(schema.Language)+len(dialect)+len(revision))
	if metadataBytes > resource.MaxDocumentBytes || len(document) > resource.MaxDocumentBytes-metadataBytes {
		return resource.EditorSchema{}, 0, resource.NewError("RESOURCE_LIMIT", "Helm editor schema exceeds presentation budget")
	}
	return schema, metadataBytes + len(document), nil
}
