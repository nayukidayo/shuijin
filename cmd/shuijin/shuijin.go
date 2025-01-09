package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/nayukidayo/shuijin/ui"
)

type GW struct {
	Gateway string `json:"gateway"`
	Value   int    `json:"value"`
	Time    int64  `json:"time"`
}

type Cache struct {
	mu    sync.RWMutex
	store map[string]GW
}

func NewCache(size int) *Cache {
	c := &Cache{store: make(map[string]GW, size)}
	for v := range size {
		c.Set("k"+strconv.Itoa(v+1), GW{})
	}
	return c
}

func (c *Cache) Get(key string) (GW, bool) {
	c.mu.RLock()
	val, ok := c.store[key]
	c.mu.RUnlock()
	return val, ok
}

func (c *Cache) Set(key string, value GW) {
	c.mu.Lock()
	c.store[key] = value
	c.mu.Unlock()
}

func (c *Cache) Json() ([]byte, error) {
	c.mu.RLock()
	b, err := json.Marshal(c.store)
	c.mu.RUnlock()
	return b, err
}

var cache = NewCache(40)

func main() {
	http.HandleFunc("POST /api/gw/{code}", CreateGateway())
	http.HandleFunc("GET /api/gw", ViewGateway())
	http.HandleFunc("GET /{file...}", handleFS())
	http.ListenAndServe(":3068", nil)
}

func handleFS() http.HandlerFunc {
	dist, _ := ui.DistFS()
	return func(w http.ResponseWriter, r *http.Request) {
		var cc string
		f, err := dist.Open(r.PathValue("file"))
		if err == nil {
			f.Close()
			cc = "max-age=1209600, stale-while-revalidate=86400"
		} else {
			r.URL.Path = "/"
			cc = "no-cache"
		}
		w.Header().Set("Cache-Control", cc)
		http.FileServerFS(dist).ServeHTTP(w, r)
	}
}

func CreateGateway() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.PathValue("code")

		switch code {
		case "241", "242", "243", "244", "245":
		default:
			w.WriteHeader(http.StatusNotFound)
			return
		}

		var m map[string]any

		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		for k, v := range m {
			if val, ok := cache.Get(k); ok {
				val.Gateway = code
				val.Value = int(v.(float64))
				val.Time = time.Now().UnixMilli()
				cache.Set(k, val)
			}
		}
	}
}

func ViewGateway() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if b, err := cache.Json(); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		} else {
			w.Write(b)
		}
	}
}
