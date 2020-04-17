#include "simdjson.h"
using namespace std;

auto cars_json = R"( [
  { "make": "Toyota", "model": "Camry",  "year": 2018, "tire_pressure": [ 40.1, 39.9 ], "fast": true, "info": null },
  { "make": "Kia",    "model": "Soul",   "year": 2012, "tire_pressure": [ 30.1, 31.0 ], "fast": false, "info": null},
  { "make": "Toyota", "model": "Tercel", "year": 1999, "tire_pressure": [ 29.8, 30.0 ], "fast": true, "info": null}
] )"_padded;

int main(void) {
  simdjson::dom::parser parser;
  simdjson::dom::element cars = parser.parse(cars_json);
  simdjson::dom::document* doc = &parser.doc;

  uint64_t* tape_buf = doc->tape.get();
  uint8_t* str_buf = doc->string_buf.get();
  uint64_t tape_buf_len = parser.current_loc;
  uint8_t str_buf_len = parser.current_string_buf_loc - str_buf;

  std::ofstream tape_buf_file ("tape.buffer",std::ofstream::binary);
  tape_buf_file.write(reinterpret_cast<char*>(tape_buf), tape_buf_len * sizeof(uint64_t));
  tape_buf_file.close();

  std::ofstream str_buf_file ("str.buffer",std::ofstream::binary);
  str_buf_file.write(reinterpret_cast<char*>(str_buf), str_buf_len * sizeof(uint8_t));
  str_buf_file.close();
}