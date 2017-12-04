// reference to the section with id 'video'
const SECTION_VIDEO = document.getElementById("video");

// reference to the section with id 'defaultContent'
const DEFAULT_CONTENT = document.getElementById("defaultContent");

var app = angular.module('ngApp', []);
app.controller('ngCtrl',
    function ($scope, $http) {

        // an array of objects with necessary attributes
        $scope.videoLinks = [{title: '', thumbUrl: '', videoId: '', description: ''}];

        /**
         * Reads the user input and makes the appropriate query to solr.
         * Builds the query first, then makes an http get request.
         * Calls {@link $scope.resolveQuery} to filter and sort the list.
         */
        $scope.submitSearch = function () {

            var queryInput = document.getElementById("query").value;
            var location = "http://localhost:8983/solr/hitlist/select?";

            var dateRestrictions = "";
            // set start-end date restrictions
            var startDate = document.getElementById("startDate").value;
            var endDate = document.getElementById("endDate").value;
            if (startDate != "") {
                // opening
                dateRestrictions = "&fq=publishedAt:[";

                // start
                dateRestrictions += startDate + "T00:00:00Z TO ";

                // end
                if (endDate == "")
                    dateRestrictions += startDate;//only on this day
                else dateRestrictions += endDate;

                // closing
                dateRestrictions += "T24:00:00Z]";
            }
            else if (endDate != "")
                console.log("end date defined without start date is ignored");

            var queryToSend = location + dateRestrictions + "&q=" + queryInput + "&rows=50&wt=json";

            // send and resolve query
            $http.get(queryToSend).then(function (response) {
                document.getElementById("videolist").style.display = "block";
                $scope.resolveQuery(response.data);
            });

        };// submitSearch() closing

        /**
         * Updates the main content to show the video.
         *
         * @param video the video to show
         */
        $scope.videoSelected = function (video) {

            DEFAULT_CONTENT.style.display = "none";
            SECTION_VIDEO.style.display = "block";

            $scope.videoTitle = video.title;
            $scope.videoDesc = video.description;
            document.getElementById("iframe").setAttribute("src", "https://www.youtube.com/embed/" + video.videoId);

            var date = new Date(video.publishedAt);
            $scope.videoPublished = "Published on " + date.toDateString();


        };// videoSelected() closing

        /**
         * Resolves the response to the query.
         * Loads video list, clears duplicates, sorts the videos.
         *
         * @param response the response from the http.get() method when used with a query to solr
         */
        $scope.resolveQuery = function (response) {

            $scope.videoLinks = response.response.docs;

            SECTION_VIDEO.style.display = "none";
            DEFAULT_CONTENT.style.display = "block";

            // heading and text depend whether or not videos are found.
            var header = DEFAULT_CONTENT.getElementsByTagName("h1")[0];
            var para = DEFAULT_CONTENT.getElementsByTagName("p")[0];
            if ($scope.videoLinks.length == 0) {
                header.innerHTML = "Oops! Sorry, no videos found!";
                para.innerHTML = "Please, try another search.";
            }
            else {
                header.innerHTML = "Videos found!";
                para.innerHTML = "Select a video to watch.";
            }

            //sort videos by id and position
            $scope.videoLinks.sort(function (a, b) {

                // same videos are sorted by position
                if ( a.videoId == b.videoId)
                    return a.position - b.position;

                if (a.videoId < b.videoId) return -1;
                else return 1;

            });

            /*
             * Now that all videos are sorted by id and position, duplicates are deleted.
             * Only the first copy of each video is kept
             * which is the copy with the best position.
             */
            var len = $scope.videoLinks.length;
            for (var i = 1; i < len; i++) {
                if ($scope.videoLinks[i].videoId == $scope.videoLinks[i - 1].videoId) {
                    $scope.videoLinks.splice(i--, 1);
                    len--;
                }

            }

            $scope.videoLinks.sort(function (a, b) {

                // order by position
                var diff = a.position - b.position;
                if ( diff != 0 )
                    return diff;

                // order by date if position is the same
                var aDate = new Date(a.publishedAt).getTime();
                var bDate = new Date(b.publishedAt).getTime();
                return bDate - aDate;

            });

        };// resolveQuery() closing

    });// app.controller() closing