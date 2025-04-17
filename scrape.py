import os
import json
import time
import requests
import argparse
import concurrent.futures
from urllib.parse import quote_plus, urlparse, urljoin
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import logging
import threading
import queue
import re
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(threadName)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("yoga_scraper.log")
    ]
)
logger = logging.getLogger(__name__)

class YogaImageScraper:
    def __init__(self, output_dir="yoga_images", delay=1, threads=12):
        """Initialize the scraper with output directory, delay between requests, and thread count."""
        self.output_dir = output_dir
        self.delay = delay
        self.thread_count = threads
        self.results = {}
        self.driver_lock = threading.Lock()
        self.results_lock = threading.Lock()
        self.task_queue = queue.Queue()
        self.download_queue = queue.Queue()

        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Setup Chrome options
        self.chrome_options = Options()
        self.chrome_options.add_argument("--headless")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-extensions")
        self.chrome_options.add_argument("--disable-notifications")
        self.chrome_options.add_argument("--disable-infobars")
        self.chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36")

        # Create a driver for each thread
        self.drivers = []

    def initialize_drivers(self):
        """Initialize a webdriver for each thread."""
        for i in range(self.thread_count):
            try:
                driver = webdriver.Chrome(
                    service=Service(ChromeDriverManager().install()),
                    options=self.chrome_options
                )
                driver.set_page_load_timeout(30)  # Set timeout to 30 seconds
                self.drivers.append(driver)
                logger.info(f"Initialized driver {i+1}")
            except Exception as e:
                logger.error(f"Error initializing driver {i+1}: {e}")

    def close_drivers(self):
        """Close all webdrivers."""
        for driver in self.drivers:
            try:
                driver.quit()
            except:
                pass
        logger.info("All drivers closed")

    def sanitize_filename(self, filename):
        """Sanitize the filename to be valid for file systems."""
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        return filename.strip()

    def search_artofliving(self, asana_name, driver):
        """Search Art of Living website for yoga poses."""
        logger.info(f"Searching Art of Living for: {asana_name}")
        search_url = f"https://www.artofliving.org/in-en/search/site/{quote_plus(asana_name)}%20yoga%20pose"

        try:
            driver.get(search_url)
            time.sleep(self.delay)

            # Look for search results
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            search_results = soup.select('ol.search-results li')

            for result in search_results[:3]:  # Check first 3 results
                try:
                    link_elem = result.select_one('h3.title a')
                    if not link_elem:
                        continue

                    link = link_elem['href']
                    if not link.startswith('http'):
                        link = 'https://www.artofliving.org' + link

                    driver.get(link)
                    time.sleep(self.delay)

                    content_soup = BeautifulSoup(driver.page_source, 'html.parser')

                    # Advanced selectors to find images in different content areas
                    image_selectors = [
                        'div.content img',
                        'div.field-body img',
                        'article img',
                        'div.main-content img',
                        'figure img',
                        '.yoga-pose-image img',
                        'img[alt*="{}"]'.format(asana_name.split()[0].lower())
                    ]

                    for selector in image_selectors:
                        images = content_soup.select(selector)
                        for img in images:
                            if not img.get('src'):
                                continue
                                
                            # Check if image is relevant to the asana
                            img_alt = img.get('alt', '').lower()
                            img_src = img.get('src', '').lower()
                            
                            # Use each word from the asana name to check relevance
                            asana_terms = [term.lower() for term in asana_name.split()]
                            if any(term in img_alt or term in img_src for term in asana_terms):
                                img_url = img['src']
                                if not img_url.startswith('http'):
                                    img_url = urljoin(link, img_url)
                                
                                # Skip data URLs, icons, and tiny images
                                if 'data:' in img_url or 'icon' in img_url.lower():
                                    continue
                                    
                                return {
                                    'url': img_url,
                                    'source': link,
                                    'site': 'artofliving.org'
                                }
                except Exception as e:
                    logger.error(f"Error processing Art of Living result for {asana_name}: {e}")

        except Exception as e:
            logger.error(f"Error searching Art of Living for {asana_name}: {e}")
        
        return None

    def search_yogajournal(self, asana_name, driver):
        """Search Yoga Journal for yoga poses."""
        logger.info(f"Searching Yoga Journal for: {asana_name}")
        search_url = f"https://www.yogajournal.com/search/?q={quote_plus(asana_name)}"

        try:
            driver.get(search_url)
            time.sleep(self.delay * 2)  # More delay for this site

            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Try different selectors for search results
            search_result_selectors = [
                'div.search-result-item', 
                'article.archive-item', 
                '.search-results a', 
                '.article-card'
            ]
            
            search_results = []
            for selector in search_result_selectors:
                results = soup.select(selector)
                if results:
                    search_results = results
                    break

            for result in search_results[:3]:  # Check first 3 results
                try:
                    link_elem = result.select_one('a')
                    if not link_elem:
                        continue

                    link = link_elem['href']
                    if not link.startswith('http'):
                        link = 'https://www.yogajournal.com' + link

                    driver.get(link)
                    time.sleep(self.delay)

                    content_soup = BeautifulSoup(driver.page_source, 'html.parser')

                    # Try multiple selectors to find the main pose image
                    image_selectors = [
                        'div.article-content img', 
                        'figure.wp-block-image img',
                        'div.featured-image img',
                        '.entry-content img',
                        '.pose-image img',
                        'img.attachment-full',
                        'img[alt*="{}"]'.format(asana_name.split()[0].lower())
                    ]
                    
                    for selector in image_selectors:
                        images = content_soup.select(selector)
                        for img in images:
                            if img.get('src'):
                                img_url = img['src']
                                if not img_url.startswith('http'):
                                    img_url = urljoin(link, img_url)
                                
                                # Skip small images, icons, avatars, etc.
                                if ('icon' in img_url.lower() or 
                                    'avatar' in img_url.lower() or 
                                    'logo' in img_url.lower()):
                                    continue
                                
                                return {
                                    'url': img_url,
                                    'source': link,
                                    'site': 'yogajournal.com'
                                }
                except Exception as e:
                    logger.error(f"Error processing Yoga Journal result for {asana_name}: {e}")

        except Exception as e:
            logger.error(f"Error searching Yoga Journal for {asana_name}: {e}")
        
        return None

    def search_healthline(self, asana_name, driver):
        """Search Healthline for yoga poses."""
        logger.info(f"Searching Healthline for: {asana_name}")
        search_url = f"https://www.healthline.com/search?q1={quote_plus(asana_name)}%20yoga%20pose"

        try:
            driver.get(search_url)
            time.sleep(self.delay * 2)  # More delay for this site

            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Try multiple selectors for search results
            search_result_selectors = [
                'a.css-2iwa69',
                '.results-page a',
                '.css-al7via a',
                '.search-results a',
                '.search-result-item a'
            ]
            
            search_results = []
            for selector in search_result_selectors:
                results = soup.select(selector)
                if results:
                    search_results = results
                    break

            for result in search_results[:3]:  # Check first 3 results
                try:
                    link = result['href']
                    if not link.startswith('http'):
                        link = 'https://www.healthline.com' + link

                    driver.get(link)
                    time.sleep(self.delay)

                    content_soup = BeautifulSoup(driver.page_source, 'html.parser')

                    # Try multiple selectors to find images in the article content
                    image_selectors = [
                        'article img',
                        '.article-body img',
                        '.css-8atqhb img',
                        '.content img',
                        'figure img',
                        '.yoga-pose img',
                        'img[alt*="{}"]'.format(asana_name.split()[0].lower())
                    ]
                    
                    for selector in image_selectors:
                        images = content_soup.select(selector)
                        for img in images:
                            if not img.get('src'):
                                continue
                                
                            # Check if image is relevant to the asana
                            img_alt = img.get('alt', '').lower()
                            asana_terms = [term.lower() for term in asana_name.split()]
                            
                            if any(term in img_alt for term in asana_terms):
                                img_url = img['src']
                                if not img_url.startswith('http'):
                                    img_url = urljoin(link, img_url)
                                
                                # Skip icons, small images
                                if ('icon' in img_url.lower() or 
                                    'logo' in img_url.lower()):
                                    continue
                                
                                return {
                                    'url': img_url,
                                    'source': link,
                                    'site': 'healthline.com'
                                }
                except Exception as e:
                    logger.error(f"Error processing Healthline result for {asana_name}: {e}")

        except Exception as e:
            logger.error(f"Error searching Healthline for {asana_name}: {e}")
        
        return None

    def search_with_google(self, asana_name, driver):
        """Search Google for yoga pose images as a fallback."""
        logger.info(f"Searching Google Images for: {asana_name}")
        search_url = f"https://www.google.com/search?q={quote_plus(asana_name)}+yoga+pose&tbm=isch"

        try:
            driver.get(search_url)
            time.sleep(self.delay * 2)  # Give more time for Google images to load

            # Execute JavaScript to scroll down and load more images
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(self.delay)

            soup = BeautifulSoup(driver.page_source, 'html.parser')

            # Try multiple selectors to find images
            image_selectors = [
                'img.rg_i',
                'img.Q4LuWd',
                'img.n3VNCb',
                '.islir img'
            ]
            
            for selector in image_selectors:
                images = soup.select(selector)
                if images:
                    for img in images[:10]:  # Try first 10 images
                        try:
                            if img.get('src') and 'data:image' not in img['src']:
                                img_url = img['src']
                            elif img.get('data-src'):
                                img_url = img['data-src']
                            elif img.get('data-iurl'):
                                img_url = img['data-iurl']
                            else:
                                continue

                            # Skip tiny thumbnails and icons
                            if ('icon' in img_url.lower() or 
                                'logo' in img_url.lower() or
                                'favicon' in img_url.lower()):
                                continue

                            return {
                                'url': img_url,
                                'source': search_url,
                                'site': 'google.com'
                            }
                        except Exception as e:
                            logger.error(f"Error processing Google image for {asana_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error searching Google for {asana_name}: {e}")
        
        return None

    def search_wikimedia(self, asana_name, driver):
        """Search Wikimedia Commons for yoga pose images."""
        logger.info(f"Searching Wikimedia Commons for: {asana_name}")
        search_url = f"https://commons.wikimedia.org/w/index.php?search={quote_plus(asana_name)}+yoga&title=Special:MediaSearch&type=image"
        
        try:
            driver.get(search_url)
            time.sleep(self.delay)
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Try to find image elements
            images = soup.select('.sdms-search-results img, .sdms-grid-view-item img')
            
            for img in images[:5]:
                if img.get('src'):
                    img_url = img['src']
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    
                    return {
                        'url': img_url,
                        'source': search_url,
                        'site': 'wikimedia.org'
                    }
                    
        except Exception as e:
            logger.error(f"Error searching Wikimedia Commons for {asana_name}: {e}")
            
        return None

    def search_pexels(self, asana_name, driver):
        """Search Pexels for yoga images."""
        logger.info(f"Searching Pexels for: {asana_name}")
        search_url = f"https://www.pexels.com/search/{quote_plus(asana_name)}%20yoga/"
        
        try:
            driver.get(search_url)
            time.sleep(self.delay * 2)
            
            # Scroll down to load more images
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(self.delay)
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Try to find image elements
            images = soup.select('article img')
            
            for img in images[:5]:
                if img.get('src') and not img.get('src').endswith('blank.gif'):
                    img_url = img['src']
                    return {
                        'url': img_url,
                        'source': search_url,
                        'site': 'pexels.com'
                    }
                elif img.get('data-large-src'):
                    img_url = img['data-large-src']
                    return {
                        'url': img_url,
                        'source': search_url,
                        'site': 'pexels.com'
                    }
                    
        except Exception as e:
            logger.error(f"Error searching Pexels for {asana_name}: {e}")
            
        return None

    def download_image(self, img_data):
        """Download an image and save it to the output directory."""
        img_url = img_data['url']
        asana_name = img_data['asana_name']
        
        try:
            # Set headers to mimic a browser
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': img_data['source']
            }
            
            response = requests.get(img_url, stream=True, timeout=15, headers=headers)
            response.raise_for_status()

            # Determine content type and file extension
            content_type = response.headers.get('content-type', '')
            
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = 'jpg'
            elif 'png' in content_type:
                ext = 'png'
            elif 'gif' in content_type:
                ext = 'gif'
            elif 'webp' in content_type:
                ext = 'webp'
            elif 'svg' in content_type:
                ext = 'svg'
            else:
                # Try to get extension from URL
                url_ext = os.path.splitext(urlparse(img_url).path)[1]
                if url_ext and len(url_ext) <= 5:  # Valid extension
                    ext = url_ext.lstrip('.')
                else:
                    ext = 'jpg'  # Default

            # Create a safe filename
            safe_name = self.sanitize_filename(asana_name)
            filename = f"{safe_name}.{ext}"
            filepath = os.path.join(self.output_dir, filename)

            # Save the image
            with open(filepath, 'wb') as file:
                for chunk in response.iter_content(chunk_size=8192):
                    file.write(chunk)

            logger.info(f"Downloaded image for {asana_name} to {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"Error downloading image for {asana_name}: {e}")
            return None

    def download_worker(self):
        """Worker thread for downloading images."""
        while True:
            try:
                img_data = self.download_queue.get()
                if img_data is None:  # Signal to stop the thread
                    self.download_queue.task_done()
                    break
                
                local_path = self.download_image(img_data)
                
                if local_path:
                    with self.results_lock:
                        self.results[img_data['asana_name']] = {
                            "url": img_data['url'],
                            "source": img_data['source'],
                            "local_path": local_path,
                            "site": img_data['site']
                        }
                
                self.download_queue.task_done()
            except Exception as e:
                logger.error(f"Error in download worker: {e}")
                self.download_queue.task_done()

    def search_worker(self, worker_id):
        """Worker thread for searching images."""
        driver = self.drivers[worker_id]
        logger.info(f"Search worker {worker_id} started")
        
        while True:
            try:
                asana = self.task_queue.get()
                if asana is None:  # Signal to stop the thread
                    self.task_queue.task_done()
                    break
                
                asana_name = asana['name']
                logger.info(f"Worker {worker_id} processing: {asana_name}")
                
                # Try different sources in order of preference
                image_info = None
                methods = [
                    self.search_artofliving,
                    self.search_yogajournal,
                    self.search_healthline,
                    self.search_wikimedia,
                    self.search_pexels,
                    self.search_with_google
                ]

                for method in methods:
                    if image_info:
                        break
                    
                    # Reset cookies and cache for each new search to avoid tracking
                    driver.delete_all_cookies()
                    
                    try:
                        image_info = method(asana_name, driver)
                    except Exception as e:
                        logger.error(f"Error calling {method.__name__} for {asana_name}: {e}")
                    
                    if image_info:
                        logger.info(f"Found image for {asana_name} on {image_info['site']}")

                if image_info:
                    # Add to download queue
                    image_info['asana_name'] = asana_name
                    self.download_queue.put(image_info)
                else:
                    logger.warning(f"❌ Could not find an image for {asana_name}")
                
                self.task_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in search worker {worker_id}: {e}")
                self.task_queue.task_done()
                
        logger.info(f"Search worker {worker_id} finished")

    def extract_unique_asanas(self, yoga_data):
        """Extract unique asanas from the yoga data."""
        all_asanas = []

        for category in yoga_data:
            for exercise in category.get('exercises', []):
                asana_name = exercise['name']
                if asana_name not in [a['name'] for a in all_asanas]:
                    all_asanas.append({
                        'name': asana_name,
                        'category': category['name']
                    })

        logger.info(f"Found {len(all_asanas)} unique asanas to process")
        return all_asanas

    def process_yoga_data(self, yoga_data):
        """Process yoga data to find images for each asana."""
        try:
            # Extract unique asanas
            all_asanas = self.extract_unique_asanas(yoga_data)
            
            # Initialize drivers
            self.initialize_drivers()
            
            # Start download worker threads (2 threads)
            download_threads = []
            for i in range(2):
                thread = threading.Thread(target=self.download_worker)
                thread.daemon = True
                thread.start()
                download_threads.append(thread)
                
            # Start search worker threads
            search_threads = []
            for i in range(min(self.thread_count, len(self.drivers))):
                thread = threading.Thread(target=self.search_worker, args=(i,))
                thread.daemon = True
                thread.start()
                search_threads.append(thread)
            
            # Add asanas to the task queue
            for asana in all_asanas:
                self.task_queue.put(asana)
                
            # Add None to signal threads to stop
            for _ in range(len(search_threads)):
                self.task_queue.put(None)
                
            # Wait for all search tasks to complete
            self.task_queue.join()
            
            # Wait for all download tasks to complete
            self.download_queue.join()
            
            # Add None to signal download threads to stop
            for _ in range(len(download_threads)):
                self.download_queue.put(None)
                
            # Wait for all threads to finish
            for thread in search_threads:
                thread.join()
            for thread in download_threads:
                thread.join()
                
            # Close all drivers
            self.close_drivers()
            
            # Print results
            success_count = len(self.results)
            logger.info(f"\nSuccessfully found images for {success_count} out of {len(all_asanas)} asanas")
            
            # Save results to JSON file
            results_path = os.path.join(self.output_dir, 'results.json')
            with open(results_path, 'w') as f:
                json.dump(self.results, f, indent=2)
            
            logger.info(f"Results saved to {results_path}")
            
            # Create summary file
            summary_path = os.path.join(self.output_dir, 'summary.txt')
            with open(summary_path, 'w') as f:
                f.write(f"Total asanas: {len(all_asanas)}\n")
                f.write(f"Successfully downloaded: {success_count}\n")
                f.write(f"Success rate: {success_count/len(all_asanas)*100:.2f}%\n\n")
                
                # List of missing asanas
                missing = [a['name'] for a in all_asanas if a['name'] not in self.results]
                f.write("Missing asanas:\n")
                for name in missing:
                    f.write(f"- {name}\n")
                
                # Sources breakdown
                sources = {}
                for info in self.results.values():
                    site = info['site']
                    sources[site] = sources.get(site, 0) + 1
                
                f.write("\nSources breakdown:\n")
                for site, count in sources.items():
                    f.write(f"{site}: {count} images ({count/success_count*100:.2f}%)\n")
            
            logger.info(f"Summary saved to {summary_path}")
            
        except Exception as e:
            logger.error(f"Error processing yoga data: {e}")
            # Try to close drivers in case of error
            try:
                self.close_drivers()
            except:
                pass

def parse_json_string(json_str):
    """Parse the JSON string and return the yoga data."""
    try:
        # Find the start of the array in the string
        start_idx = json_str.find("[")
        end_idx = json_str.rfind("]")
        if start_idx != -1 and end_idx != -1:
            json_array = json_str[start_idx:end_idx+1]
            return json.loads(json_array)
        else:
            raise ValueError("Could not find JSON array in the string")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Scrape yoga asana images from the web')
    parser.add_argument('--input', type=str, help='Input JSON file containing yoga asana data')
    parser.add_argument('--output', type=str, default='yoga_images', help='Output directory for downloaded images')
    parser.add_argument('--delay', type=float, default=1.0, help='Delay between requests (seconds)')
    parser.add_argument('--threads', type=int, default=12, help='Number of worker threads')
    args = parser.parse_args()

    yoga_data = None

    if args.input:
        try:
            with open(args.input, 'r') as f:
                content = f.read()
                yoga_data = parse_json_string(content)
        except Exception as e:
            logger.error(f"Error reading input file: {e}")
            return
    else:
        # Use the data from the script if no input file is provided
        logger.info("No input file provided. Using the embedded data.")
        yoga_data_str = """
        [
          {
            "name": "Brain Health",
            "description": "Exercises to enhance cognitive function and mental clarity",
            "exercises": [
              {
                "name": "Bhramari Pranayama (Humming Bee Breathing)",
                "duration": "5-10 minutes",
                "description": "Calms the mind, releases negative emotions, improves concentration and memory, builds confidence.",
                "benefits": ["Improved concentration", "Stress relief", "Better memory", "Emotional balance"]
              },
              {
                "name": "Paschimottanasana (Seated Forward Bend)",
                "duration": "1-3 minutes",
                "description": "Stretches the spine, helps relieve stress, and relaxes the mind.",
                "benefits": ["Spine flexibility", "Mental relaxation", "Stress reduction"]
              },
              {
                "name": "Halasana (Plow Pose)",
                "duration": "1-5 minutes",
                "description": "Improves blood flow to the brain, stretches the back and neck, reduces stress and fatigue.",
                "benefits": ["Improved blood flow", "Stress reduction", "Neck and back stretch"]
              },
              {
                "name": "Setu Bandhasana (Bridge Pose)",
                "duration": "1-3 minutes",
                "description": "Strengthens and stretches the neck and spine, calms the brain, reduces anxiety, stress, and depression.",
                "benefits": ["Spine and neck strength", "Anxiety reduction", "Stress relief"]
              },
              {
                "name": "Sarvangasana (Shoulder Stand)",
                "duration": "3-5 minutes",
                "description": "Regulates thyroid and parathyroid glands, nourishes the brain, and improves cognitive functions.",
                "benefits": ["Thyroid regulation", "Brain nourishment", "Cognitive improvement"]
              },
              {
                "name": "Super Brain Yoga",
                "duration": "1-3 minutes",
                "description": "Increases brain power, synchronizes left and right brain, stimulates thinking capacity, improves focus, concentration, and memory.",
                "benefits": ["Increased brain power", "Improved focus", "Better memory"]
              }
            ]
          },
         
          {
            "name": "Back Pain Relief",
            "description": "Gentle poses to alleviate back pain and improve posture",
            "exercises": [
              {
                "name": "Lengthening the Spine",
                "duration": "30 seconds",
                "description": "Lifts arms, interlaces fingers, stretches up, and holds posture.",
                "benefits": ["Improved posture", "Spine alignment", "Pain relief"]
              },
              {
                "name": "Twisting the Spine",
                "duration": "30 seconds each side",
                "description": "Twists to the right and left, holds each position.",
                "benefits": ["Spine flexibility", "Pain relief", "Improved mobility"]
              },
              {
                "name": "Bending the Spine",
                "duration": "30 seconds each direction",
                "description": "Bends to the right and left, stretches forward and backward.",
                "benefits": ["Spine flexibility", "Pain relief", "Improved mobility"]
              },
              {
                "name": "Side-to-Side Twisting",
                "duration": "30 seconds each side",
                "description": "Twists to each side while keeping one hand on the opposite knee.",
                "benefits": ["Spine flexibility", "Pain relief", "Improved mobility"]
              }
            ]
          },
          {
            "name": "Boosting Metabolism",
            "description": "Poses to enhance metabolic rate and improve digestion",
            "exercises": [
              {
                "name": "Kapal Bhati Pranayama",
                "duration": "5-10 minutes",
                "description": "Boosts metabolic rate, stimulates abdominal organs, improves digestion, and trims the belly.",
                "benefits": ["Improved metabolism", "Better digestion", "Belly trimming"]
              },
              {
                "name": "Eka Pada Raja Kapotasana",
                "duration": "30-60 seconds each side",
                "description": "Stimulates abdominal organs, enhances digestion, improves blood circulation.",
                "benefits": ["Improved digestion", "Better blood circulation", "Abdominal stimulation"]
              },
              {
                "name": "Utkatasana",
                "duration": "30-60 seconds",
                "description": "Tones thighs, knees, and legs, improves body posture.",
                "benefits": ["Toned legs", "Improved posture", "Thigh and knee strength"]
              },
              {
                "name": "Ustrasana",
                "duration": "30-60 seconds",
                "description": "Enhances digestion, strengthens the lower back, and tones abdominal organs.",
                "benefits": ["Improved digestion", "Lower back strength", "Abdominal toning"]
              }
            ]
          },
          {
            "name": "Fertility",
            "description": "Poses to enhance fertility and reproductive health",
            "exercises": [
              {
                "name": "Nadi Shodhan Pranayama (Alternate Nostril Breathing)",
                "duration": "5-10 minutes",
                "description": "Calms the mind and body, purifies energy channels.",
                "benefits": ["Mind and body calmness", "Energy purification", "Stress relief"]
              },
              {
                "name": "Bhramari Pranayama (Bee Breath)",
                "duration": "5-10 minutes",
                "description": "Relieves tension, anger, and anxiety.",
                "benefits": ["Tension relief", "Anxiety reduction", "Emotional balance"]
              },
              {
                "name": "Paschimottanasana (Seated Forward Bend)",
                "duration": "1-3 minutes",
                "description": "Stimulates uterus and ovaries, relieves stress and depression.",
                "benefits": ["Uterus and ovary stimulation", "Stress relief", "Depression reduction"]
              },
              {
                "name": "Hastapadasana (Standing Forward Bend)",
                "duration": "1-3 minutes",
                "description": "Stretches muscles, improves blood supply to the pelvic region.",
                "benefits": ["Muscle stretch", "Improved blood supply", "Pelvic health"]
              },
              {
                "name": "Janu Shirasana (One-legged Forward Bend)",
                "duration": "1-3 minutes each side",
                "description": "Strengthens back muscles.",
                "benefits": ["Back muscle strength", "Flexibility", "Spine health"]
              },
              {
                "name": "Badhakonasana (Butterfly Pose)",
                "duration": "1-3 minutes",
                "description": "Stretches inner thighs and groins, ensures smooth delivery.",
                "benefits": ["Inner thigh stretch", "Groin stretch", "Smooth delivery"]
              },
              {
                "name": "Viparita Karani (Legs Up the Wall Pose)",
                "duration": "5-10 minutes",
                "description": "Relieves tired legs, backache, improves blood flow to the pelvic region.",
                "benefits": ["Leg relief", "Backache relief", "Improved blood flow"]
              },
              {
                "name": "Yoga Nidra (Yogic Sleep)",
                "duration": "15-30 minutes",
                "description": "Attains equilibrium, reduces stress, prepares mind and body for conception.",
                "benefits": ["Equilibrium", "Stress reduction", "Conception preparation"]
              }
            ]
          },
          {
            "name": "Arthritis Relief",
            "description": "Poses to alleviate arthritis pain and improve joint health",
            "exercises": [
              {
                "name": "Veerbhadrasana (Warrior Pose)",
                "duration": "30-60 seconds each side",
                "description": "Strengthens arms, legs, and lower back, beneficial for frozen shoulders.",
                "benefits": ["Arm and leg strength", "Lower back strength", "Shoulder health"]
              },
              {
                "name": "Vrikshasana (Tree Pose)",
                "duration": "30-60 seconds each side",
                "description": "Strengthens legs and back, improves balance.",
                "benefits": ["Leg and back strength", "Improved balance", "Joint health"]
              },
              {
                "name": "Marjariasana (Cat Stretch)",
                "duration": "1-3 minutes",
                "description": "Brings flexibility, strength to the spine, wrists, and shoulders.",
                "benefits": ["Spine flexibility", "Wrist and shoulder strength", "Joint health"]
              },
              {
                "name": "Setubandhasana (Bridge Pose)",
                "duration": "30-60 seconds",
                "description": "Strengthens back muscles, stretches neck, chest, and spine.",
                "benefits": ["Back muscle strength", "Neck and chest stretch", "Spine health"]
              },
              {
                "name": "Trikonasana (Triangle Pose)",
                "duration": "30-60 seconds each side",
                "description": "Effective for back pain and sciatica, stretches and strengthens the spine.",
                "benefits": ["Back pain relief", "Sciatica relief", "Spine strength"]
              },
              {
                "name": "Shavasana (Corpse Pose)",
                "duration": "5-10 minutes",
                "description": "Complete relaxation, repairs tissues and cells, releases stress.",
                "benefits": ["Complete relaxation", "Stress relief", "Cell repair"]
              }
            ]
          },
          {
            "name": "Shoulder Pain",
            "description": "Poses to alleviate shoulder pain and improve shoulder health",
            "exercises": [
              {
                "name": "Garudasana (Eagle Pose)",
                "duration": "30-60 seconds each side",
                "description": "Stretches shoulders and upper back.",
                "benefits": ["Shoulder stretch", "Upper back stretch", "Joint health"]
              },
              {
                "name": "Paschim Namaskarasana (Reverse Prayer Pose)",
                "duration": "30-60 seconds",
                "description": "Stretches shoulder joints and pectoral muscles.",
                "benefits": ["Shoulder joint stretch", "Pectoral muscle stretch", "Joint health"]
              },
              {
                "name": "Ustrasana (Camel Pose)",
                "duration": "30-60 seconds",
                "description": "Stretches and strengthens the front of the body, relieves lower backache.",
                "benefits": ["Front body stretch", "Lower backache relief", "Body strength"]
              },
              {
                "name": "Dhanurasana (Bow Pose)",
                "duration": "30-60 seconds",
                "description": "Opens the chest, neck, and shoulders, reduces stress and fatigue.",
                "benefits": ["Chest and shoulder opening", "Stress reduction", "Fatigue relief"]
              },
              {
                "name": "Purvottanasana (Upward Plank Pose)",
                "duration": "30-60 seconds",
                "description": "Stretches shoulders, chest, and neck, strengthens shoulders and back.",
                "benefits": ["Shoulder and chest stretch", "Back strength", "Joint health"]
              }
            ]
          },
          {
            "name": "Irritable Bowel Syndrome (IBS)",
            "description": "Poses to alleviate IBS symptoms and improve digestive health",
            "exercises": [
              {
                "name": "Bhramari Pranayama (Bee Breath)",
                "duration": "5-10 minutes",
                "description": "Relieves stress and tension.",
                "benefits": ["Stress relief", "Tension relief", "Emotional balance"]
              },
              {
                "name": "Paschimottanasana (Seated Forward Bend)",
                "duration": "1-3 minutes",
                "description": "Stimulates digestive organs.",
                "benefits": ["Digestive stimulation", "Abdominal health", "Stress relief"]
              },
              {
                "name": "Setubandhasana (Bridge Pose)",
                "duration": "30-60 seconds",
                "description": "Strengthens the back, stretches the stomach.",
                "benefits": ["Back strength", "Stomach stretch", "Digestive health"]
              },
              {
                "name": "Shavasana (Corpse Pose)",
                "duration": "5-10 minutes",
                "description": "Relaxes the entire body, aids in stress relief.",
                "benefits": ["Complete relaxation", "Stress relief", "Body relaxation"]
              }
            ]
          }
        ]
        """
        yoga_data = parse_json_string(yoga_data_str)

    if not yoga_data:
        logger.error("Failed to load yoga data. Exiting.")
        return 1

    try:
        # Create and run the scraper
        scraper = YogaImageScraper(output_dir=args.output, delay=args.delay, threads=args.threads)
        scraper.process_yoga_data(yoga_data)
        return 0
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)